import { resolveCorsOrigin } from './cors';

describe('resolveCorsOrigin', () => {
  it('siempre permite localhost y 127.0.0.1 (desarrollo con la app web)', () => {
    expect(resolveCorsOrigin('http://localhost:8081')).toBe('http://localhost:8081');
    expect(resolveCorsOrigin('http://127.0.0.1:8081')).toBe('http://127.0.0.1:8081');
    expect(resolveCorsOrigin('https://localhost')).toBe('https://localhost');
    expect(resolveCorsOrigin('http://[::1]:19006')).toBe('http://[::1]:19006');
  });

  it('rechaza cualquier otro origen salvo que esté en la lista', () => {
    expect(resolveCorsOrigin('https://sitio-malicioso.example')).toBeNull();
    expect(resolveCorsOrigin('https://localhost.sitio-malicioso.example')).toBeNull();
    expect(resolveCorsOrigin('http://localhost:8081.evil.example')).toBeNull();
    expect(resolveCorsOrigin('https://app.restaurante.example', ['https://app.restaurante.example'])).toBe(
      'https://app.restaurante.example',
    );
  });

  it('con "*" permite cualquiera', () => {
    expect(resolveCorsOrigin('https://cualquiera.example', ['*'])).toBe('*');
  });

  it('sin cabecera Origin (apps nativas) no aplica CORS', () => {
    expect(resolveCorsOrigin(undefined, ['*'])).toBeNull();
  });
});
