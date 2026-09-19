// Package snappayfeed serves the SnappPay / Searchwise product feed.
//
// It reproduces the wire contract of the official "Searchwise API Data Feed"
// WooCommerce plugin (v1.0.2) so their ingester needs no change for a store
// that is not WooCommerce: same POST route, same x-api-key header, same
// envelope, same field names and value vocabulary.
//
// Deliberate boundaries (see SNAPPAY_SEARCH_FEED_PLAN.md §2):
//
//   - The package is READ-ONLY. It never writes to MongoDB — not even a
//     convenience backfill — and it creates no collection, field or index.
//   - It never touches the product structure. models.Product, ColorVariant
//     and SizeVariant are consumed as-is; every feed-shaped value lives in
//     this package's own DTOs and is derived per request.
//   - Everything lives under snappayfeed/ so the feature can be removed by
//     deleting this directory and reverting two call sites. See README.md.
//
// The feed is variant-first: one row per color variant, each with its own
// stable id, its own deep link, its own images and its own stock state
// computed from that variant's sizes — mirroring how the storefront itself
// lists products (ListProducts paginates per color variant).
package snappayfeed
