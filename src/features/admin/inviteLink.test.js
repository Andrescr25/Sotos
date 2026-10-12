import { Platform } from 'react-native';

jest.mock('expo-linking', () => ({
  createURL: (path) => `exp://127.0.0.1:8081/--${path}`,
}));

// Se importa después del mock.
const { buildInviteMessage, buildInviteUrl, buildWhatsAppUrl } = require('./inviteLink');

describe('buildInviteUrl', () => {
  const originalOS = Platform.OS;
  const originalOverride = process.env.EXPO_PUBLIC_APP_URL;

  afterEach(() => {
    Platform.OS = originalOS;
    if (originalOverride === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
    else process.env.EXPO_PUBLIC_APP_URL = originalOverride;
  });

  it('en la app nativa usa el esquema de la app (Linking.createURL)', () => {
    Platform.OS = 'ios';
    expect(buildInviteUrl('abc')).toBe('exp://127.0.0.1:8081/--/invitacion/abc');
  });

  it('en la web usa el dominio de la página', () => {
    Platform.OS = 'web';
    globalThis.location = { origin: 'https://sotos-app.onrender.com' };
    expect(buildInviteUrl('abc')).toBe('https://sotos-app.onrender.com/invitacion/abc');
  });

  it('EXPO_PUBLIC_APP_URL manda sobre todo lo demás (y tolera la barra final)', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://app.restaurante.example/';
    Platform.OS = 'web';
    expect(buildInviteUrl('abc')).toBe('https://app.restaurante.example/invitacion/abc');
  });
});

describe('mensajes', () => {
  it('arma el texto para el empleado', () => {
    expect(buildInviteMessage({ name: 'Luis', url: 'https://x.test/i/1' })).toBe(
      'Hola Luis, este es tu enlace para entrar a Sotos y crear tu contraseña: https://x.test/i/1',
    );
    expect(buildInviteMessage({ name: 'Luis', url: 'https://x.test/i/1', isReset: true })).toMatch(
      /crear una contraseña nueva/,
    );
  });

  it('codifica el mensaje para WhatsApp', () => {
    expect(buildWhatsAppUrl('Hola & adiós')).toBe('https://wa.me/?text=Hola%20%26%20adi%C3%B3s');
  });
});
