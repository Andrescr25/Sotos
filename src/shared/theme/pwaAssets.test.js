/**
 * La app web se instala desde el navegador gracias a public/manifest.json.
 * Estas pruebas evitan que el manifest o los íconos se rompan sin que nadie
 * lo note, y que sus colores se desvíen de los tokens del tema.
 */
import fs from 'fs';
import path from 'path';
import { theme } from '@/shared/theme';

const root = path.resolve(__dirname, '../../..');
const publicDir = path.join(root, 'public');

const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));
const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

/** Ancho y alto leídos de la cabecera de un PNG. */
function pngSize(file) {
  const buffer = fs.readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe('manifest.json', () => {
  it('declara una app instalable', () => {
    expect(manifest).toMatchObject({
      name: expect.any(String),
      short_name: expect.any(String),
      start_url: '/',
      display: 'standalone',
    });
  });

  it('usa los colores del tema (un solo lugar para cambiar la marca)', () => {
    expect(manifest.theme_color.toLowerCase()).toBe(theme.colors.primary.toLowerCase());
    expect(manifest.background_color.toLowerCase()).toBe(theme.colors.background.toLowerCase());
  });

  it('tiene íconos de 192 y 512 px, y uno "maskable", todos existentes y del tamaño declarado', () => {
    const purposes = manifest.icons.map((icon) => icon.purpose);
    expect(purposes).toContain('maskable');

    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));

    manifest.icons.forEach((icon) => {
      const file = path.join(publicDir, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(file)).toBe(true);
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(pngSize(file)).toEqual({ width, height });
    });
  });
});

describe('public/index.html', () => {
  it('enlaza el manifest y el ícono de iOS, y fija idioma y color', () => {
    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(indexHtml).toContain('rel="apple-touch-icon"');
    expect(indexHtml).toContain('<html lang="es">');
    expect(indexHtml).toContain(`name="theme-color" content="${theme.colors.primary}"`);
  });

  it('el ícono de iOS existe y mide 180 px', () => {
    expect(pngSize(path.join(publicDir, 'apple-touch-icon.png'))).toEqual({ width: 180, height: 180 });
  });
});
