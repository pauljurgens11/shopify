/**
 * Curated product photography (H1).
 *
 * Every id below is a pinned Unsplash photo, hand-picked to match the product
 * it illustrates and verified reachable (HTTP 200) and on-subject by eye on a
 * contact sheet before landing. Pinning beats a random-image service on the
 * KPI: "Alpine Merino Crewneck" must show knitwear, not whatever a seeded
 * placeholder happens to serve — and a pinned id is exactly as deterministic.
 *
 * Primary images are unique per product (two products sharing a photo in a
 * collection grid reads as a data bug); secondaries may reuse another
 * product's primary, since they only ever appear inside that product's own
 * gallery. Adding a product? Add its two ids here — `productImageUrl` falls
 * back to a picsum placeholder so the seed never breaks, but the fallback is
 * a wrong-subject photo, so treat it as a TODO, not a feature.
 */

export function unsplashImage(id: string, width: number, height: number): string {
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&q=80&auto=format`;
}

/** handle → [primary, secondary] Unsplash photo ids. */
export const PRODUCT_IMAGES: Record<string, [string, string]> = {
  'alpine-merino-crewneck': ['1556905055-8f358a7a47b2', '1620799140408-edc6dcb6d633'],
  'cascade-waxed-canvas-jacket': ['1591047139829-d91aecb6caea', '1520975954732-35dd22299614'],
  'foundry-oxford-shirt': ['1602810318383-e386cc2a3ccf', '1603252109303-2751441dd157'],
  'ridgeline-flannel-overshirt': ['1596755094514-f87e34085b2c', '1473966968600-fa801b869a1a'],
  'union-heavyweight-tee': ['1521572163474-6864f9cf17ab', '1503341504253-dff4815485f1'],
  'pacific-pocket-tee': ['1583743814966-8936f5b7be1a', '1562157873-818bc0726f68'],
  'hemlock-fleece-hoodie': ['1620799140408-edc6dcb6d633', '1548126032-079a0fb0099d'],
  'selvedge-denim-jean': ['1542272604-787c3835535d', '1475178626620-a4d074967452'],
  'camp-chore-coat': ['1611312449408-fcece27cdbb7', '1516257984-b1b4d707412e'],
  'trailhead-anorak': ['1520975661595-6453be3f7070', '1473966968600-fa801b869a1a'],
  'rambler-chino': ['1473966968600-fa801b869a1a', '1544441893-675973e31985'],
  'wharf-cable-knit-sweater': ['1434389677669-e08b4cac3105', '1556905055-8f358a7a47b2'],
  'willamette-merino-beanie': ['1510598969022-c4c6c5d05769', '1556905055-8f358a7a47b2'],
  'basin-wool-socks': ['1511556820780-d912e42b4980', '1556905055-8f358a7a47b2'],
  'kettle-leather-belt': ['1624222247344-550fb60583dc', '1524805444758-089113d48a6d'],
  'dispatch-canvas-tote': ['1590874103328-eac38a683ce7', '1547949003-9792a18a2601'],
  'overland-weekender-duffel': ['1547949003-9792a18a2601', '1445205170230-053b83016050'],
  'field-notes-cap': ['1575428652377-a2d80e2277fc', '1622445275576-721325763afe'],
  'steward-linen-shirt': ['1603252109303-2751441dd157', '1596755094514-f87e34085b2c'],
  'northbound-puffer-vest': ['1548126032-079a0fb0099d', '1520975954732-35dd22299614'],
  'cobble-corduroy-trouser': ['1544441893-675973e31985', '1593030761757-71fae45fa0e7'],
  'harbor-striped-long-sleeve': ['1523381210434-271e8be1f52b', '1521572163474-6864f9cf17ab'],
  'mesa-waffle-henley': ['1618517351616-38fb9c5210c6', '1562157873-818bc0726f68'],
  'granite-work-shirt': ['1495105787522-5334e3ffa0ef', '1602810318383-e386cc2a3ccf'],
  'timber-wool-scarf': ['1539533018447-63fcce2678e3', '1556905055-8f358a7a47b2'],
  'dockside-rain-shell': ['1520975954732-35dd22299614', '1445205170230-053b83016050'],
  'junction-sweatpant': ['1541099649105-f69ad21f3246', '1544441893-675973e31985'],
  'cinder-leather-card-holder': ['1524805444758-089113d48a6d', '1624222247344-550fb60583dc'],
  'portage-backpack': ['1553062407-98eeb64c6a62', '1547949003-9792a18a2601'],
  'lantern-cotton-boxer': ['1562157873-818bc0726f68', '1521572163474-6864f9cf17ab'],
  'quarry-shearling-coat': ['1544923246-77307dd654cb', '1591047139829-d91aecb6caea'],
  'ferry-cotton-cardigan': ['1593030761757-71fae45fa0e7', '1602810318383-e386cc2a3ccf'],
};

/** handle → wide banner photo id. */
export const COLLECTION_IMAGES: Record<string, string> = {
  featured: '1567401893414-76b7b1e5a7a5',
  'new-arrivals': '1489987707025-afc232f7ea0f',
  outerwear: '1445205170230-053b83016050',
  'everyday-basics': '1521572163474-6864f9cf17ab',
};
