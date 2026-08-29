'use client';

/**
 * The Description editor (docs/parity/product-form.md → left column card 1).
 * Owner: WS-B (B5).
 *
 * Shopify's description is a rich text editor, not a textarea, and a textarea
 * is one of the loudest "this isn't Shopify" tells on the page: the toolbar row
 * is the first thing under the Title field. So this is a real editor — a
 * `contenteditable` surface driven by `document.execCommand`, which is
 * deprecated and still the only thing every browser implements identically for
 * this job. The alternative (ProseMirror/Lexical) is a locked-stack change
 * (SPEC §3) for a two-day build.
 *
 * The value IS html, in and out. Nothing unwraps `<p>` tags any more, so a
 * merchant's list or bold text round-trips byte for byte.
 *
 * Two details that are easy to get wrong and silently break editing:
 *   - The DOM owns the text while you type. Writing `value` back into
 *     `innerHTML` on every keystroke re-creates the nodes and throws the caret
 *     to the start, so it is written back ONLY when the value changed from
 *     outside (mount, Discard, a save that re-seeds the form).
 *   - Toolbar buttons must not steal the selection. Their `mousedown` default
 *     is prevented, and the last range inside the editor is remembered anyway,
 *     because opening a popover moves focus.
 */
import {
  ActionList,
  Box,
  Button,
  ButtonGroup,
  InlineStack,
  Labelled,
  Popover,
} from '@shopify/polaris';
import {
  CodeIcon,
  LinkIcon,
  ListBulletedIcon,
  ListNumberedIcon,
  MenuHorizontalIcon,
  OutdentIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextColorIcon,
  TextIndentIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from '@shopify/polaris-icons';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

const BLOCKS = [
  { label: 'Paragraph', tag: 'p' },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
] as const;

const ALIGNMENTS = [
  { label: 'Left', command: 'justifyLeft', icon: TextAlignLeftIcon },
  { label: 'Center', command: 'justifyCenter', icon: TextAlignCenterIcon },
  { label: 'Right', command: 'justifyRight', icon: TextAlignRightIcon },
] as const;

/** Enough of a palette to be useful; Shopify's picker is a full colour wheel. */
const COLORS = [
  { label: 'Automatic', value: '' },
  { label: 'Black', value: '#202223' },
  { label: 'Grey', value: '#6d7175' },
  { label: 'Red', value: '#d72c0d' },
  { label: 'Orange', value: '#b98900' },
  { label: 'Green', value: '#008060' },
  { label: 'Blue', value: '#2c6ecb' },
  { label: 'Purple', value: '#5c6ac4' },
] as const;

/** Scoped to the one class below, so it cannot leak into the rest of the admin. */
const EDITOR_CSS = `
.merchant-rte {
  min-height: 120px;
  padding: var(--p-space-300);
  outline: none;
  font-size: var(--p-font-size-325);
  line-height: var(--p-font-line-height-500);
  color: var(--p-color-text);
  overflow-wrap: anywhere;
}
.merchant-rte > *:first-child { margin-block-start: 0; }
.merchant-rte > *:last-child { margin-block-end: 0; }
.merchant-rte p { margin-block: 0 var(--p-space-300); }
.merchant-rte h1 { font-size: var(--p-font-size-600); font-weight: var(--p-font-weight-semibold); margin-block: var(--p-space-400) var(--p-space-200); }
.merchant-rte h2 { font-size: var(--p-font-size-500); font-weight: var(--p-font-weight-semibold); margin-block: var(--p-space-400) var(--p-space-200); }
.merchant-rte h3 { font-size: var(--p-font-size-400); font-weight: var(--p-font-weight-semibold); margin-block: var(--p-space-400) var(--p-space-200); }
.merchant-rte ul, .merchant-rte ol { margin-block: 0 var(--p-space-300); padding-inline-start: var(--p-space-600); }
.merchant-rte a { color: var(--p-color-text-emphasis); text-decoration: underline; }
.merchant-rte:focus-visible { outline: none; }
`;

export function RichTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const id = useId();
  const editor = useRef<HTMLDivElement | null>(null);
  /** The html the DOM already holds, so our own edits never re-seed it. */
  const mirrored = useRef(value);
  const savedRange = useRef<Range | null>(null);

  const [focused, setFocused] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [openMenu, setOpenMenu] = useState<'block' | 'align' | 'color' | 'more' | 'link' | null>(
    null,
  );
  const [linkUrl, setLinkUrl] = useState('https://');

  // Only when `value` came from somewhere other than this editor: mount,
  // Discard, or a save that re-seeded the form from the server's answer.
  useEffect(() => {
    const element = editor.current;
    if (!element || value === mirrored.current) return;
    element.innerHTML = value;
    mirrored.current = value;
  }, [value]);

  /**
   * Seeds the surface with the current html on mount — and on the REMOUNT that
   * toggling Show HTML causes, where the effect above sees no change and would
   * leave an empty editor behind. `useCallback` keeps the identity stable, so
   * React does not re-run it (and re-seed, throwing the caret) every render.
   */
  const attach = useCallback((node: HTMLDivElement | null) => {
    editor.current = node;
    if (node) node.innerHTML = mirrored.current;
  }, []);

  const emit = useCallback(() => {
    const element = editor.current;
    if (!element) return;
    // `<br>` is what an emptied contenteditable leaves behind; treating it as
    // content would make an untouched form dirty and save an empty paragraph.
    const html = element.innerHTML === '<br>' ? '' : element.innerHTML;
    mirrored.current = html;
    onChange(html);
  }, [onChange]);

  const remember = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  /**
   * `selectionchange` on the document, not keyup/mouseup on the element: the
   * caret also moves for input methods that fire neither (paste, autocorrect,
   * a driven browser), and every one of those left `exec` restoring a stale
   * range — which put the merchant's next word at the top of the description.
   */
  useEffect(() => {
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, [remember]);

  const exec = useCallback(
    (command: string, argument?: string) => {
      const element = editor.current;
      if (!element) return;
      element.focus();
      const selection = window.getSelection();
      if (selection) {
        // Focusing a contenteditable with no live selection drops the caret at
        // the START, so an unknown caret has to mean "the end" — never
        // position 0, which silently prepends whatever comes next.
        const range = savedRange.current ?? document.createRange();
        if (!savedRange.current) {
          range.selectNodeContents(element);
          range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
      // Tags rather than inline styles, so the stored html stays portable.
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(command, false, argument);
      remember();
      emit();
    },
    [emit, remember],
  );

  const run = (command: string, argument?: string) => () => {
    setOpenMenu(null);
    exec(command, argument);
  };

  const menuButton = (
    key: 'block' | 'align' | 'color' | 'more' | 'link',
    activator: React.ReactElement,
    content: React.ReactNode,
  ) => (
    <Popover
      active={openMenu === key}
      activator={activator}
      onClose={() => setOpenMenu(null)}
      preferredAlignment="left"
      autofocusTarget="none"
    >
      {content}
    </Popover>
  );

  return (
    <Labelled id={id} label={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a <style> element's own rules, no user input */}
      <style dangerouslySetInnerHTML={{ __html: EDITOR_CSS }} />
      <Box
        borderWidth="025"
        borderColor={focused ? 'border-focus' : 'border'}
        borderRadius="200"
        background="bg-surface"
        overflowX="hidden"
        overflowY="hidden"
      >
        {/* The toolbar must not take focus away from the text, or execCommand
            has no selection to act on. */}
        {/** biome-ignore lint/a11y/noStaticElementInteractions: focus guard only, no behaviour of its own */}
        <div
          onMouseDown={(event) => event.preventDefault()}
          style={{
            padding: 'var(--p-space-200)',
            borderBlockEnd: 'var(--p-border-width-025) solid var(--p-color-border)',
          }}
        >
          <InlineStack align="space-between" blockAlign="center" gap="200">
            <InlineStack gap="100" blockAlign="center" wrap={false}>
              {menuButton(
                'block',
                <Button
                  size="slim"
                  disclosure
                  disabled={showHtml}
                  onClick={() => setOpenMenu(openMenu === 'block' ? null : 'block')}
                >
                  Paragraph
                </Button>,
                <ActionList
                  items={BLOCKS.map((block) => ({
                    content: block.label,
                    onAction: run('formatBlock', `<${block.tag}>`),
                  }))}
                />,
              )}

              <ButtonGroup variant="segmented">
                <Button
                  size="slim"
                  icon={TextBoldIcon}
                  accessibilityLabel="Bold"
                  disabled={showHtml}
                  onClick={run('bold')}
                />
                <Button
                  size="slim"
                  icon={TextItalicIcon}
                  accessibilityLabel="Italic"
                  disabled={showHtml}
                  onClick={run('italic')}
                />
                <Button
                  size="slim"
                  icon={TextUnderlineIcon}
                  accessibilityLabel="Underline"
                  disabled={showHtml}
                  onClick={run('underline')}
                />
              </ButtonGroup>

              {menuButton(
                'color',
                <Button
                  size="slim"
                  icon={TextColorIcon}
                  accessibilityLabel="Text colour"
                  disabled={showHtml}
                  onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
                />,
                <Box padding="200">
                  <InlineStack gap="100" wrap>
                    {COLORS.map((color) => (
                      <button
                        key={color.label}
                        type="button"
                        aria-label={color.label}
                        title={color.label}
                        onClick={
                          color.value === '' ? run('removeFormat') : run('foreColor', color.value)
                        }
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          cursor: 'pointer',
                          borderRadius: 'var(--p-border-radius-100)',
                          border: 'var(--p-border-width-025) solid var(--p-color-border)',
                          background:
                            color.value === ''
                              ? 'var(--p-color-bg-surface-secondary)'
                              : color.value,
                        }}
                      />
                    ))}
                  </InlineStack>
                </Box>,
              )}

              {menuButton(
                'align',
                <Button
                  size="slim"
                  icon={TextAlignLeftIcon}
                  accessibilityLabel="Alignment"
                  disclosure
                  disabled={showHtml}
                  onClick={() => setOpenMenu(openMenu === 'align' ? null : 'align')}
                />,
                <ActionList
                  items={ALIGNMENTS.map((alignment) => ({
                    content: alignment.label,
                    icon: alignment.icon,
                    onAction: run(alignment.command),
                  }))}
                />,
              )}

              {menuButton(
                'more',
                <Button
                  size="slim"
                  icon={MenuHorizontalIcon}
                  accessibilityLabel="More formatting"
                  disabled={showHtml}
                  onClick={() => setOpenMenu(openMenu === 'more' ? null : 'more')}
                />,
                <ActionList
                  items={[
                    {
                      content: 'Bulleted list',
                      icon: ListBulletedIcon,
                      onAction: run('insertUnorderedList'),
                    },
                    {
                      content: 'Numbered list',
                      icon: ListNumberedIcon,
                      onAction: run('insertOrderedList'),
                    },
                    { content: 'Outdent', icon: OutdentIcon, onAction: run('outdent') },
                    { content: 'Indent', icon: TextIndentIcon, onAction: run('indent') },
                    { content: 'Clear formatting', onAction: run('removeFormat') },
                  ]}
                />,
              )}

              {menuButton(
                'link',
                <Button
                  size="slim"
                  icon={LinkIcon}
                  accessibilityLabel="Link"
                  disabled={showHtml}
                  onClick={() => setOpenMenu(openMenu === 'link' ? null : 'link')}
                />,
                <Box padding="300">
                  <InlineStack gap="200" blockAlign="center">
                    <input
                      aria-label="Link URL"
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      style={{
                        width: 220,
                        padding: 'var(--p-space-150) var(--p-space-200)',
                        borderRadius: 'var(--p-border-radius-200)',
                        border: 'var(--p-border-width-025) solid var(--p-color-border)',
                        font: 'inherit',
                      }}
                    />
                    <Button
                      size="slim"
                      onClick={() => {
                        const url = linkUrl.trim();
                        if (url !== '' && url !== 'https://') exec('createLink', url);
                        setOpenMenu(null);
                      }}
                    >
                      Link
                    </Button>
                  </InlineStack>
                </Box>,
              )}
            </InlineStack>

            <Button
              size="slim"
              icon={CodeIcon}
              accessibilityLabel="Show HTML"
              pressed={showHtml}
              onClick={() => setShowHtml((current) => !current)}
            />
          </InlineStack>
        </div>

        {showHtml ? (
          <textarea
            id={id}
            aria-label={`${label} HTML`}
            value={value}
            onChange={(event) => {
              mirrored.current = event.target.value;
              onChange(event.target.value);
            }}
            spellCheck={false}
            style={{
              display: 'block',
              width: '100%',
              minHeight: 120,
              padding: 'var(--p-space-300)',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'var(--p-font-family-mono)',
              fontSize: 'var(--p-font-size-300)',
              color: 'var(--p-color-text)',
              background: 'transparent',
            }}
          />
        ) : (
          <>
            {/** biome-ignore lint/a11y/useSemanticElements: no semantic element holds rich text — role=textbox on a contenteditable is the ARIA-sanctioned shape */}
            <div
              id={id}
              ref={attach}
              className="merchant-rte"
              role="textbox"
              aria-multiline="true"
              aria-label={label}
              tabIndex={0}
              contentEditable
              onInput={emit}
              onBlur={() => {
                setFocused(false);
                emit();
              }}
              onFocus={() => setFocused(true)}
              onKeyUp={remember}
              onMouseUp={remember}
            />
          </>
        )}
      </Box>
    </Labelled>
  );
}
