/**
 * The Aurora Supply Co. catalogue (H1).
 *
 * Hand-written, not generated: a Shopify reviewer reads these titles and
 * descriptions in the demo, and "Test Product 1" ends the illusion instantly
 * (CLAUDE.md §8). Prices are integer minor units in clean retail points.
 *
 * Aurora is a small-run Portland apparel label — merino, waxed canvas, honest
 * hardware — which is why the copy, vendors and tags all read the same way.
 */

export interface SeedProductOption {
  name: string;
  values: string[];
}

export interface SeedProduct {
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  /** Base price in minor units; variants may step up from it. */
  price: number;
  /** Set only on the handful of products that should show a sale badge. */
  compareAtPrice?: number;
  status?: 'active' | 'draft' | 'archived';
  description: string;
  options?: SeedProductOption[];
  skuPrefix: string;
  weightGrams?: number;
}

const SIZES = ['S', 'M', 'L', 'XL'];
const XS_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const WAIST = ['30', '32', '34', '36'];

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    handle: 'alpine-merino-crewneck',
    title: 'Alpine Merino Crewneck',
    vendor: 'Aurora Supply Co.',
    productType: 'Knitwear',
    tags: ['knitwear', 'merino', 'new'],
    price: 14800,
    skuPrefix: 'AUR-KNT-ALP',
    weightGrams: 420,
    description:
      'A mid-weight crewneck knit from 19.5-micron merino, spun and finished in Portland. Warm without bulk, breathable enough to keep on indoors, and it recovers its shape overnight on a flat surface.',
    options: [
      { name: 'Size', values: SIZES },
      { name: 'Color', values: ['Oatmeal', 'Slate'] },
    ],
  },
  {
    handle: 'cascade-waxed-canvas-jacket',
    title: 'Cascade Waxed Canvas Jacket',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['outerwear', 'waxed-canvas', 'flagship'],
    price: 22000,
    skuPrefix: 'AUR-OUT-CAS',
    weightGrams: 1250,
    description:
      'Ten-ounce waxed cotton canvas with a corduroy-lined collar, two bellows pockets and antique brass hardware. It arrives stiff, breaks in over a season, and can be re-waxed indefinitely.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'foundry-oxford-shirt',
    title: 'Foundry Oxford Shirt',
    vendor: 'Foundry Goods',
    productType: 'Shirts',
    tags: ['shirts', 'everyday'],
    price: 9800,
    skuPrefix: 'FGD-SHT-FOX',
    weightGrams: 380,
    description:
      'A proper oxford: long-staple cotton, unfused button-down collar, single-needle side seams. Cut with a touch more room through the chest than a dress shirt so it works untucked.',
    options: [
      { name: 'Size', values: SIZES },
      { name: 'Color', values: ['White', 'Blue'] },
    ],
  },
  {
    handle: 'ridgeline-flannel-overshirt',
    title: 'Ridgeline Flannel Overshirt',
    vendor: 'Aurora Supply Co.',
    productType: 'Shirts',
    tags: ['shirts', 'layering', 'new'],
    price: 12800,
    compareAtPrice: 15800,
    skuPrefix: 'AUR-SHT-RDG',
    weightGrams: 620,
    description:
      'Brushed cotton flannel heavy enough to wear as a light jacket. Chest pockets sized for a notebook, a straight hem, and a shoulder cut that clears a pack strap.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'union-heavyweight-tee',
    title: 'Union Heavyweight Tee',
    vendor: 'Aurora Supply Co.',
    productType: 'Tees',
    tags: ['tees', 'everyday', 'basics'],
    price: 3800,
    skuPrefix: 'AUR-TEE-UNI',
    weightGrams: 240,
    description:
      'Seven-ounce ring-spun cotton, tubular knit so the side seams never twist in the wash. The collar is double-ribbed and will still stand up after a hundred wears.',
    options: [
      { name: 'Size', values: XS_SIZES },
      { name: 'Color', values: ['Natural', 'Black', 'Forest'] },
    ],
  },
  {
    handle: 'pacific-pocket-tee',
    title: 'Pacific Pocket Tee',
    vendor: 'Aurora Supply Co.',
    productType: 'Tees',
    tags: ['tees', 'basics'],
    price: 3200,
    skuPrefix: 'AUR-TEE-PAC',
    weightGrams: 210,
    description:
      'A softer, lighter counterpart to the Union, with a patch pocket set slightly high so it sits right under an open shirt. Garment-dyed in small lots.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'hemlock-fleece-hoodie',
    title: 'Hemlock Fleece Hoodie',
    vendor: 'Aurora Supply Co.',
    productType: 'Knitwear',
    tags: ['knitwear', 'everyday'],
    price: 11800,
    skuPrefix: 'AUR-KNT-HEM',
    weightGrams: 700,
    description:
      'Loopback cotton fleece with a two-panel hood that actually holds its shape and a kangaroo pocket deep enough for gloves. Pre-shrunk, so it fits the same in year three.',
    options: [
      { name: 'Size', values: SIZES },
      { name: 'Color', values: ['Heather Grey', 'Navy'] },
    ],
  },
  {
    handle: 'selvedge-denim-jean',
    title: 'Selvedge Denim Jean',
    vendor: 'Cascade Mills',
    productType: 'Denim',
    tags: ['denim', 'flagship'],
    price: 16800,
    skuPrefix: 'CSM-DNM-SEL',
    weightGrams: 780,
    description:
      'Fourteen-and-a-half-ounce raw selvedge from a shuttle loom, cut straight through the thigh with a slight taper below the knee. Copper rivets, chain-stitched hem.',
    options: [{ name: 'Waist', values: WAIST }],
  },
  {
    handle: 'camp-chore-coat',
    title: 'Camp Chore Coat',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['outerwear', 'new'],
    price: 19500,
    skuPrefix: 'AUR-OUT-CMP',
    weightGrams: 980,
    description:
      'The classic French work jacket, redrawn: four patch pockets, a blanket-lined body and a collar that buttons closed against wind. Cotton twill that softens fast.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'trailhead-anorak',
    title: 'Trailhead Anorak',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['outerwear', 'technical'],
    price: 17500,
    skuPrefix: 'AUR-OUT-TRL',
    weightGrams: 540,
    description:
      'A half-zip pullover shell in recycled ripstop with a kangaroo pocket, storm hood and pit vents. Packs into its own pocket and weighs less than a paperback.',
    options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
  },
  {
    handle: 'rambler-chino',
    title: 'Rambler Chino',
    vendor: 'Aurora Supply Co.',
    productType: 'Trousers',
    tags: ['trousers', 'everyday', 'basics'],
    price: 8800,
    skuPrefix: 'AUR-TRS-RAM',
    weightGrams: 560,
    description:
      'Peached cotton twill with a hidden stretch panel at the waistband, slash pockets and a clean straight leg. The one pair that works for dinner and a long walk after.',
    options: [
      { name: 'Waist', values: WAIST },
      { name: 'Color', values: ['Stone', 'Olive'] },
    ],
  },
  {
    handle: 'wharf-cable-knit-sweater',
    title: 'Wharf Cable Knit Sweater',
    vendor: 'Aurora Supply Co.',
    productType: 'Knitwear',
    tags: ['knitwear', 'wool'],
    price: 15800,
    skuPrefix: 'AUR-KNT-WHF',
    weightGrams: 820,
    description:
      'A five-gauge lambswool cable knit with saddle shoulders, worked heavy enough to stand in for a jacket in October. Undyed, so the wool keeps its natural depth.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'willamette-merino-beanie',
    title: 'Willamette Merino Beanie',
    vendor: 'Aurora Supply Co.',
    productType: 'Accessories',
    tags: ['accessories', 'merino', 'new'],
    price: 4400,
    skuPrefix: 'AUR-ACC-WIL',
    weightGrams: 90,
    description:
      'A fine-gauge merino watch cap with a deep cuff you can fold once for a close fit or leave long. No itch, no bulk under a hood.',
    options: [{ name: 'Color', values: ['Charcoal', 'Rust', 'Moss'] }],
  },
  {
    handle: 'basin-wool-socks',
    title: 'Basin Wool Socks',
    vendor: 'Basin & Range',
    productType: 'Accessories',
    tags: ['accessories', 'basics'],
    price: 1800,
    skuPrefix: 'BSR-ACC-BSN',
    weightGrams: 110,
    description:
      'Cushioned merino crew socks with a reinforced heel and a ribbed cuff that stays up. Sold as a single pair; buy several, you will.',
    options: [{ name: 'Size', values: ['M', 'L'] }],
  },
  {
    handle: 'kettle-leather-belt',
    title: 'Kettle Leather Belt',
    vendor: 'Foundry Goods',
    productType: 'Accessories',
    tags: ['accessories', 'leather'],
    price: 7800,
    skuPrefix: 'FGD-ACC-KTL',
    weightGrams: 260,
    description:
      'Full-grain vegetable-tanned leather, cut a shade under an inch and a half, with a solid brass buckle on a Chicago screw so you can swap it. Darkens with wear.',
    options: [{ name: 'Size', values: ['32', '34', '36'] }],
  },
  {
    handle: 'dispatch-canvas-tote',
    title: 'Dispatch Canvas Tote',
    vendor: 'Aurora Supply Co.',
    productType: 'Bags',
    tags: ['bags', 'everyday'],
    price: 6400,
    skuPrefix: 'AUR-BAG-DSP',
    weightGrams: 640,
    description:
      'Eighteen-ounce untreated canvas with leather-reinforced handles and a flat base that lets it stand on its own. One interior pocket, no zip, nothing to break.',
  },
  {
    handle: 'overland-weekender-duffel',
    title: 'Overland Weekender Duffel',
    vendor: 'Aurora Supply Co.',
    productType: 'Bags',
    tags: ['bags', 'travel', 'flagship'],
    price: 18500,
    skuPrefix: 'AUR-BAG-OVL',
    weightGrams: 1480,
    description:
      'Forty litres of waxed canvas over a leather base, with a detachable shoulder strap and a full-length brass zip. Carry-on legal on every airline we have tried.',
  },
  {
    handle: 'field-notes-cap',
    title: 'Field Notes Cap',
    vendor: 'Aurora Supply Co.',
    productType: 'Accessories',
    tags: ['accessories', 'everyday'],
    price: 3400,
    skuPrefix: 'AUR-ACC-FLD',
    weightGrams: 120,
    description:
      'A soft, unstructured six-panel in washed cotton twill with a brass slider closure and a brim you can bend once and forget about.',
    options: [{ name: 'Color', values: ['Khaki', 'Black', 'Faded Blue'] }],
  },
  {
    handle: 'steward-linen-shirt',
    title: 'Steward Linen Shirt',
    vendor: 'Foundry Goods',
    productType: 'Shirts',
    tags: ['shirts', 'summer'],
    price: 9200,
    compareAtPrice: 11500,
    skuPrefix: 'FGD-SHT-STW',
    weightGrams: 280,
    description:
      'European flax in a mid-weight plain weave, with a camp collar and a single chest pocket. It wrinkles, which is the entire point of linen.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'northbound-puffer-vest',
    title: 'Northbound Puffer Vest',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['outerwear', 'technical', 'new'],
    price: 14500,
    skuPrefix: 'AUR-OUT-NBD',
    weightGrams: 460,
    description:
      'Recycled down at 700 fill, baffled rather than stitched through so there are no cold seams. Layers under the Cascade jacket without fighting the sleeves.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'cobble-corduroy-trouser',
    title: 'Cobble Corduroy Trouser',
    vendor: 'Aurora Supply Co.',
    productType: 'Trousers',
    tags: ['trousers', 'winter'],
    price: 11000,
    skuPrefix: 'AUR-TRS-CBL',
    weightGrams: 680,
    description:
      'Eight-wale cotton corduroy with a flat front and a slightly wider leg. Deep enough in colour to pass for a wool trouser at dinner.',
    options: [{ name: 'Waist', values: WAIST }],
  },
  {
    handle: 'harbor-striped-long-sleeve',
    title: 'Harbor Striped Long Sleeve',
    vendor: 'Aurora Supply Co.',
    productType: 'Tees',
    tags: ['tees', 'everyday'],
    price: 5200,
    skuPrefix: 'AUR-TEE-HRB',
    weightGrams: 300,
    description:
      'A Breton-striped long sleeve in heavy cotton jersey, with a boat neck that holds its width and set-in sleeves that do not ride up.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'mesa-waffle-henley',
    title: 'Mesa Waffle Henley',
    vendor: 'Aurora Supply Co.',
    productType: 'Tees',
    tags: ['tees', 'layering'],
    price: 5800,
    skuPrefix: 'AUR-TEE-MSA',
    weightGrams: 340,
    description:
      'Thermal waffle knit with a three-button placket and a slightly longer body for layering. Warms up fast and dries faster.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'granite-work-shirt',
    title: 'Granite Work Shirt',
    vendor: 'Cascade Mills',
    productType: 'Shirts',
    tags: ['shirts', 'workwear'],
    price: 10500,
    skuPrefix: 'CSM-SHT-GRN',
    weightGrams: 520,
    description:
      'Heavy cotton chambray with triple-stitched seams, two flap pockets and a gusseted side. Built to the same pattern as the shirts our mill made in 1974.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'timber-wool-scarf',
    title: 'Timber Wool Scarf',
    vendor: 'Basin & Range',
    productType: 'Accessories',
    tags: ['accessories', 'wool', 'winter'],
    price: 6800,
    skuPrefix: 'BSR-ACC-TMB',
    weightGrams: 240,
    description:
      'A generously long lambswool scarf woven on a narrow loom, with hand-tied fringe. Wide enough to double as a hood on the worst mornings.',
    options: [{ name: 'Color', values: ['Ochre', 'Deep Green'] }],
  },
  {
    handle: 'dockside-rain-shell',
    title: 'Dockside Rain Shell',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['outerwear', 'technical'],
    price: 19800,
    skuPrefix: 'AUR-OUT-DCK',
    weightGrams: 720,
    description:
      'A three-layer waterproof shell with fully taped seams, a two-way zip and cuffs that seal over gloves. Quiet fabric — it does not rustle with every step.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'junction-sweatpant',
    title: 'Junction Sweatpant',
    vendor: 'Aurora Supply Co.',
    productType: 'Trousers',
    tags: ['trousers', 'everyday', 'basics'],
    price: 8400,
    skuPrefix: 'AUR-TRS-JCT',
    weightGrams: 580,
    description:
      'The same loopback fleece as the Hemlock hoodie, cut with a tapered leg and a proper drawcord in a metal-eyeleted waistband. Zip pockets, so nothing falls out.',
    options: [{ name: 'Size', values: SIZES }],
  },
  {
    handle: 'cinder-leather-card-holder',
    title: 'Cinder Leather Card Holder',
    vendor: 'Foundry Goods',
    productType: 'Accessories',
    tags: ['accessories', 'leather', 'gifts'],
    price: 4800,
    skuPrefix: 'FGD-ACC-CDR',
    weightGrams: 60,
    description:
      'Four pockets and a centre slip, cut from a single piece of vegetable-tanned shell and saddle-stitched by hand. Slims down considerably after a month.',
    options: [{ name: 'Color', values: ['Black', 'Tan'] }],
  },
  {
    handle: 'portage-backpack',
    title: 'Portage Backpack',
    vendor: 'Aurora Supply Co.',
    productType: 'Bags',
    tags: ['bags', 'travel'],
    price: 16500,
    compareAtPrice: 19500,
    skuPrefix: 'AUR-BAG-PRT',
    weightGrams: 1180,
    description:
      'A roll-top in waxed canvas with a padded fifteen-inch laptop sleeve, side water-bottle pockets and leather compression straps. Twenty-two litres, expandable to twenty-eight.',
  },
  {
    handle: 'lantern-cotton-boxer',
    title: 'Lantern Cotton Boxer',
    vendor: 'Basin & Range',
    productType: 'Accessories',
    tags: ['accessories', 'basics'],
    price: 2400,
    skuPrefix: 'BSR-ACC-LTN',
    weightGrams: 90,
    description:
      'Long-staple cotton with a covered waistband and no centre seam. Cut roomy through the seat and hemmed so the legs stay put.',
    options: [{ name: 'Size', values: SIZES }],
  },

  // A draft and an archived product: the Products index ships status tabs, and
  // an index where every row says "Active" does not demonstrate them (B5).
  {
    handle: 'quarry-shearling-coat',
    title: 'Quarry Shearling Coat',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['outerwear', 'winter'],
    price: 21500,
    status: 'draft',
    skuPrefix: 'AUR-OUT-QRY',
    weightGrams: 1900,
    description:
      'Spanish shearling with a shawl collar and horn toggles, lined in the same fleece throughout. Arriving for the winter drop — not yet released.',
    options: [{ name: 'Size', values: ['M', 'L'] }],
  },
  {
    handle: 'ferry-cotton-cardigan',
    title: 'Ferry Cotton Cardigan',
    vendor: 'Aurora Supply Co.',
    productType: 'Knitwear',
    tags: ['knitwear', 'archive'],
    price: 12500,
    status: 'archived',
    skuPrefix: 'AUR-KNT-FRY',
    weightGrams: 560,
    description:
      'A five-button cotton cardigan from the spring run. Sold through and retired; kept here for the record and for reorders.',
    options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
  },
];
