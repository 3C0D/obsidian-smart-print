/**
 * Converts embedded image src (app:// protocol) to base64 data URLs.
 * External images (http/https) are left as-is.
 * fetch() natively supports app:// protocol in Electron.
 */
export async function inlineImages(container: HTMLElement): Promise<void> {
	const images = container.querySelectorAll('img');
	await Promise.all(
		Array.from(images).map(async (img) => {
			const src = img.getAttribute('src');
			if (!src || src.startsWith('data:') || src.startsWith('http')) return;
			try {
				const response = await fetch(src);
				const blob = await response.blob();
				img.src = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.onload = (): void => resolve(reader.result as string);
					reader.readAsDataURL(blob);
				});
			} catch {
				// Replace broken images with a visible placeholder
				img.alt = img.alt || 'Image unavailable';
				img.style.cssText =
					'display:inline-block;padding:4px 8px;border:1px dashed #999;color:#999;font-size:0.85em;';
			}
		})
	);
}
