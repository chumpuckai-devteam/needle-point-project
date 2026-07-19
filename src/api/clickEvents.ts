import { isSupabaseConfigured, requireSupabase } from "../lib/supabase";

export type OutboundClickEventName = "shop_link_click" | "store_website_click";
export type OutboundClickDestinationType = "product_external_url" | "store_website_url";

export type OutboundClickEventInput = {
  eventName: OutboundClickEventName;
  productId?: string | null;
  storeId: string;
  destinationType: OutboundClickDestinationType;
  destinationUrl?: string | null;
  surface: string;
  placement?: string | null;
};

export type OutboundClickEventCountInput = {
  eventName?: OutboundClickEventName | null;
  productId?: string | null;
  storeId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
};

export type OutboundClickEventCount = {
  eventName: OutboundClickEventName;
  productId: string | null;
  storeId: string;
  eventDay: string;
  clickCount: number;
};

type DbOutboundClickEventCount = {
  event_name: OutboundClickEventName;
  product_id: string | null;
  store_id: string;
  event_day: string;
  click_count: number | string;
};

function cleanStableLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return null;
  return trimmed.replace(/[^a-z0-9_:-]/g, "_").slice(0, 80) || null;
}

export function normalizeDestinationHost(destinationUrl: string | null | undefined): string | null {
  if (!destinationUrl) return null;
  try {
    const url = new URL(destinationUrl);
    return url.hostname.toLowerCase() || null;
  } catch {
    return "unknown";
  }
}

export async function recordOutboundClickEvent(input: OutboundClickEventInput): Promise<void> {
  if (!isSupabaseConfigured) return;

  const surface = cleanStableLabel(input.surface);
  if (!surface) return;

  const isShopLink = input.eventName === "shop_link_click";
  const productId = isShopLink ? input.productId : null;
  if (isShopLink && !productId) return;
  if (!input.storeId) return;

  // Online schema uses UUID FKs — skip demo/local ids quietly.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(input.storeId)) return;
  if (productId && !uuidRe.test(productId)) return;

  const expectedDestinationType: OutboundClickDestinationType = isShopLink ? "product_external_url" : "store_website_url";
  if (input.destinationType !== expectedDestinationType) return;

  try {
    const client = requireSupabase();
    const { error } = await client.from("outbound_click_events").insert({
      event_name: input.eventName,
      product_id: productId,
      store_id: input.storeId,
      destination_type: input.destinationType,
      destination_host: normalizeDestinationHost(input.destinationUrl),
      surface,
      placement: cleanStableLabel(input.placement),
    });
    if (error) {
      // Analytics must never surface to users.
      console.debug("outbound click not recorded", error.message);
    }
  } catch (error) {
    console.debug("outbound click not recorded", error);
  }
}

export async function fetchOutboundClickEventCounts(
  input: OutboundClickEventCountInput = {},
): Promise<OutboundClickEventCount[]> {
  if (!isSupabaseConfigured) return [];

  const client = requireSupabase();
  const { data, error } = await client.rpc("outbound_click_event_counts", {
    p_event_name: input.eventName ?? null,
    p_product_id: input.productId ?? null,
    p_store_id: input.storeId ?? null,
    p_start_at: input.startAt ?? null,
    p_end_at: input.endAt ?? null,
  });
  if (error) throw error;

  return ((data as DbOutboundClickEventCount[] | null) ?? []).map((row) => ({
    eventName: row.event_name,
    productId: row.product_id,
    storeId: row.store_id,
    eventDay: row.event_day,
    clickCount: Number(row.click_count) || 0,
  }));
}
