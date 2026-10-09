import { BadRequestException } from '@nestjs/common';
import { validateActions, validateContact } from './announcement';

describe('announcement actions', () => {
  it('accepts every action the editor offers', () => {
    expect(
      validateActions([
        { type: 'contact' },
        { type: 'donate', label: { fr: 'Soutenir la distribution' } },
        { type: 'page', url: '/nous-soutenir' },
        { type: 'external', url: 'https://www.facebook.com/lds' },
      ]),
    ).toHaveLength(4);
  });

  it('never points a visitor at the back-office, the API or another host', () => {
    for (const url of ['/admin', '/admin/actualites', '/api/v1/users', '//evil.example', 'nous-soutenir']) {
      expect(() => validateActions([{ type: 'page', url }])).toThrow(BadRequestException);
    }
  });

  it('refuses an external link that is not a web address', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.example', 'pas une url']) {
      expect(() => validateActions([{ type: 'external', url }])).toThrow(BadRequestException);
    }
  });

  it('keeps no address for actions that use what the site already manages', () => {
    // "Call" uses the configured number; it cannot carry one of its own.
    expect(validateActions([{ type: 'call', url: 'tel:+221000000000' }])).toEqual([{ type: 'call' }]);
  });

  it('refuses an unknown action, and more than four', () => {
    expect(() => validateActions([{ type: 'register' }])).toThrow(BadRequestException);
    expect(() => validateActions(Array(5).fill({ type: 'contact' }))).toThrow(BadRequestException);
  });

  it('strips markup from a label', () => {
    const [action] = validateActions([{ type: 'contact', label: { fr: '<b>Écrire</b>' } }]);
    expect(action.label?.fr).toBe('Écrire');
  });
});

describe('announcement contact', () => {
  it('keeps what is given and nothing that is empty', () => {
    expect(validateContact({ name: 'Awa', phone: '+221 77 000 00 00', email: '' })).toEqual({
      name: 'Awa',
      phone: '+221 77 000 00 00',
      email: undefined,
    });
    expect(validateContact({ name: '', phone: '' })).toBeNull();
  });

  it('refuses a phone or an address that could not be dialled or written to', () => {
    expect(() => validateContact({ phone: 'appelez-moi' })).toThrow(BadRequestException);
    expect(() => validateContact({ email: 'pas-une-adresse' })).toThrow(BadRequestException);
  });
});
