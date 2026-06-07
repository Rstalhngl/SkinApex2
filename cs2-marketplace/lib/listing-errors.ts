export function listingErrorMessage(
  error: string | undefined,
  t: (key: string) => string,
): { title: string; description?: string } {
  switch (error) {
    case "unauthorized":
      return { title: t("listings.errorUnauthorized") }
    case "inventory_private":
      return { title: t("listings.errorPrivate") }
    case "asset_not_owned":
      return { title: t("listings.errorNotOwned") }
    case "already_listed":
      return { title: t("listings.errorAlreadyListed") }
    case "steam_unavailable":
      return { title: t("listings.errorSteam") }
    case "invalid_request":
      return { title: t("listings.errorInvalid") }
    default:
      return { title: t("listings.errorGeneric") }
  }
}
