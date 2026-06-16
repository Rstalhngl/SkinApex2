export function checkoutErrorMessage(
  error: string | undefined,
  t: (key: string) => string,
): string {
  switch (error) {
    case "trade_url_mismatch":
      return t("checkout.tradeUrlMismatch")
    case "invalid_trade_url":
      return t("checkout.invalidTradeUrl")
    case "asset_unavailable":
      return t("checkout.assetUnavailable")
    case "insufficient_balance":
      return t("checkout.insufficientBalance")
    case "listing_not_found":
      return t("checkout.listingNotFound")
    case "cannot_buy_own_listing":
      return t("checkout.cannotBuyOwn")
    case "empty_cart":
      return t("toast.cartEmpty")
    default:
      return t("checkout.failedDesc")
  }
}

export function offerErrorMessage(
  error: string | undefined,
  t: (key: string) => string,
): string {
  switch (error) {
    case "cannot_offer_own_listing":
      return t("offer.cannotOfferOwn")
    case "offer_too_low":
      return t("offer.tooLowGeneric")
    case "listing_not_found":
      return t("offer.listingGone")
    case "invalid_trade_url":
    case "trade_url_mismatch":
      return t("offer.tradeUrlRequiredDesc")
    default:
      return t("offer.sendFailed")
  }
}
