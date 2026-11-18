// Tests de la lógica del token de reset. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESET_TOKEN_TTL_MINUTES,
  clientIpFrom,
  hashResetToken,
  hashesEqual,
  isWellFormedToken,
  issueResetToken,
  rateLimitBucket,
  resetTokenState,
  resetUrl,
  validateNewPassword,
} from './reset-token';

test('el token es aleatorio, de 43 caracteres base64url, y se guarda sólo su hash', () => {
  const a = issueResetToken();
  const b = issueResetToken();
  assert.notEqual(a.token, b.token);
  assert.ok(isWellFormedToken(a.token));
  assert.equal(a.tokenHash.length, 64);
  assert.match(a.tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(a.tokenHash, hashResetToken(a.token));
  assert.ok(!a.tokenHash.includes(a.token));
});

test('1000 tokens sin repetidos', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) seen.add(issueResetToken().token);
  assert.equal(seen.size, 1000);
});

test('vence a los 45 minutos y la vigencia tiene que estar entre 30 y 60', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const t = issueResetToken(now);
  assert.equal(RESET_TOKEN_TTL_MINUTES, 45);
  assert.equal(t.expiresAt.getTime() - now.getTime(), 45 * 60_000);
  assert.throws(() => issueResetToken(now, 10));
  assert.throws(() => issueResetToken(now, 120));
  assert.doesNotThrow(() => issueResetToken(now, 30));
  assert.doesNotThrow(() => issueResetToken(now, 60));
});

test('estado: válido, vencido, usado y faltante', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const future = new Date(now.getTime() + 60_000);
  const past = new Date(now.getTime() - 1);
  assert.equal(resetTokenState({ expiresAt: future, usedAt: null }, now), 'valid');
  assert.equal(resetTokenState({ expiresAt: past, usedAt: null }, now), 'expired');
  assert.equal(resetTokenState({ expiresAt: now, usedAt: null }, now), 'expired');
  assert.equal(resetTokenState({ expiresAt: future, usedAt: past }, now), 'used');
  assert.equal(resetTokenState({ expiresAt: past, usedAt: past }, now), 'used');
  assert.equal(resetTokenState(null, now), 'missing');
  assert.equal(resetTokenState(undefined, now), 'missing');
});

test('formato de token: rechaza basura antes de ir a la base', () => {
  assert.equal(isWellFormedToken(''), false);
  assert.equal(isWellFormedToken('abc'), false);
  assert.equal(isWellFormedToken('a'.repeat(44)), false);
  assert.equal(isWellFormedToken("' OR 1=1 --".padEnd(43, 'x')), false);
  assert.equal(isWellFormedToken(undefined), false);
  assert.equal(isWellFormedToken(123), false);
  assert.equal(isWellFormedToken('A'.repeat(42) + '_'), true);
});

test('hashesEqual compara en tiempo constante y no acepta vacíos', () => {
  const h = hashResetToken('x');
  assert.equal(hashesEqual(h, h), true);
  assert.equal(hashesEqual(h, hashResetToken('y')), false);
  assert.equal(hashesEqual('', ''), false);
  assert.equal(hashesEqual(h, h.slice(0, 10)), false);
});

test('validación de la contraseña nueva', () => {
  assert.equal(validateNewPassword('12345678'), null);
  assert.equal(validateNewPassword('12345678', '12345678'), null);
  assert.match(validateNewPassword('1234567') ?? '', /al menos 8/);
  assert.match(validateNewPassword('12345678', '12345679') ?? '', /no coinciden/);
  assert.match(validateNewPassword('        ') ?? '', /espacios/);
  assert.match(validateNewPassword('a'.repeat(73)) ?? '', /larga/);
  assert.match(validateNewPassword('ñ'.repeat(37)) ?? '', /larga/); // 74 bytes
  assert.ok(validateNewPassword(undefined));
});

test('bucket de rate limit: estable, sin el dato en claro y normalizado', () => {
  const a = rateLimitBucket('reset-email', 'Ana@Ejemplo.com ');
  const b = rateLimitBucket('reset-email', 'ana@ejemplo.com');
  assert.equal(a, b);
  assert.ok(!a.includes('ana'));
  assert.match(a, /^reset-email:[0-9a-f]{32}$/);
  assert.notEqual(rateLimitBucket('reset-ip', 'ana@ejemplo.com'), a);
  assert.ok(a.length <= 80);
});

test('IP del cliente desde los headers', () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  assert.equal(clientIpFrom(h({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
  assert.equal(clientIpFrom(h({ 'x-real-ip': '5.6.7.8' })), '5.6.7.8');
  assert.equal(clientIpFrom(h({})), 'unknown');
});

test('link del mail', () => {
  assert.equal(resetUrl('https://nortetech.ar/', 'abc_-'), 'https://nortetech.ar/restablecer?token=abc_-');
});
