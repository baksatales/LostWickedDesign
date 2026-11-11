/** Editorial destinations and assets only: never executable HTML or inline image data. */
export const safeHomepageImage = (value: string) => !value
  || /^\/images\/baksa\/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$/i.test(value)
  || /^\/images\/baksa\/homev5-(trunk|explorer|heart|showstopper|soother|thoughtful)\.svg$/.test(value)
  || /^\/approved\/images\/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$/i.test(value)
  || /^https:\/\/[a-zA-Z0-9.-]+(?::443)?\/[^\s<>\\]*$/i.test(value);

export const safeHomepageLink = (value: string) =>
  /^\/(?!\/)[a-zA-Z0-9/_?=&%#.,~-]*$/.test(value)
  || /^https:\/\/[a-zA-Z0-9.-]+(?::443)?(?:\/[^\s<>\\]*)?$/.test(value);

export function validateHomepageLabels(labels: Record<string, string>) {
  if (Object.keys(labels).length > 200) throw new Error('Keep the label dictionary to 200 entries.');
  for (const [key, value] of Object.entries(labels)) {
    if (typeof value !== 'string' || value.length > 500) throw new Error(`Invalid label: ${key}`);
    if (key.startsWith('h5.image.') && !safeHomepageImage(value)) throw new Error('Homepage images must use supplied assets or a full HTTPS address.');
    if (key.startsWith('h5.link.') && value && !safeHomepageLink(value)) throw new Error('Homepage links must be local paths or full HTTPS addresses.');
    if (key.startsWith('h5.picks.') && value && !/^[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+){0,3}$/.test(value)) throw new Error('Choose up to four catalogue product IDs, separated by commas.');
  }
}
