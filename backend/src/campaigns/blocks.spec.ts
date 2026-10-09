import {
  InvalidBlocksError,
  inline,
  renderBlocks,
  safeUrl,
  validateBlocks,
} from './blocks';

const MEDIA = '11111111-1111-4111-8111-111111111111';
const context = { siteUrl: 'https://ldslouga.sn', locale: 'fr' as const };

describe('inline marks', () => {
  it('turns **bold** and [links](https://…) into markup', () => {
    expect(
      inline(
        'Un **grand** merci, voir [le site](https://ldslouga.sn/a?x=1&y=2)',
      ),
    ).toBe(
      'Un <strong>grand</strong> merci, voir <a href="https://ldslouga.sn/a?x=1&amp;y=2" style="color:#00A4DE;text-decoration:underline;">le site</a>',
    );
  });

  it('cannot be used to write markup', () => {
    const html = inline(
      '<script>alert(1)</script> <img src=x onerror=alert(1)>',
    );
    expect(html).not.toMatch(/<script|<img/);
    expect(html).toContain('&lt;script&gt;');
  });

  it('leaves a javascript: link as the text it was', () => {
    const html = inline('[cliquez](javascript:alert(1))');
    expect(html).not.toContain('<a');
    expect(html).not.toMatch(/href=/);
  });

  it('cannot break out of the href attribute', () => {
    const html = inline('[x](https://a.example/"onmouseover="alert(1))');
    expect(html).not.toMatch(/"\s*onmouseover=/);
  });
});

describe('safeUrl', () => {
  it('accepts web and mail links only', () => {
    expect(safeUrl('https://ldslouga.sn')).toBe('https://ldslouga.sn/');
    expect(safeUrl('mailto:contact@ldslouga.sn')).toBe(
      'mailto:contact@ldslouga.sn',
    );
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      'ldslouga.sn',
      '',
    ]) {
      expect(safeUrl(bad)).toBeNull();
    }
  });
});

describe('validateBlocks', () => {
  it('accepts every block the editor makes', () => {
    const blocks = validateBlocks([
      { type: 'heading', text: 'Titre' },
      { type: 'paragraph', text: 'Texte' },
      { type: 'list', items: ['a', 'b'] },
      { type: 'image', mediaId: MEDIA, alt: 'Une école' },
      { type: 'button', label: 'Voir', url: 'https://ldslouga.sn' },
      { type: 'divider' },
    ]);
    expect(blocks).toHaveLength(6);
  });

  it('refuses an unknown block, a button to javascript:, and an image that is not a media id', () => {
    expect(() => validateBlocks([{ type: 'html', html: '<b>x</b>' }])).toThrow(
      InvalidBlocksError,
    );
    expect(() =>
      validateBlocks([
        { type: 'button', label: 'x', url: 'javascript:alert(1)' },
      ]),
    ).toThrow(InvalidBlocksError);
    expect(() =>
      validateBlocks([{ type: 'image', mediaId: '../../etc/passwd', alt: '' }]),
    ).toThrow(InvalidBlocksError);
  });

  it('drops any field it does not know', () => {
    const [block] = validateBlocks([
      { type: 'heading', text: 'T', style: 'color:red' },
    ]);
    expect(block).toEqual({ type: 'heading', text: 'T' });
  });
});

describe('renderBlocks', () => {
  it('serves images through the resizing endpoint at the configured address', () => {
    const { html } = renderBlocks(
      [{ type: 'image', mediaId: MEDIA, alt: 'Une école' }],
      context,
    );
    expect(html).toContain(
      `https://ldslouga.sn/api/v1/media/${MEDIA}/file?w=1280`,
    );
    expect(html).toContain('alt="Une école"');
  });

  it('writes a plain-text version a person can read', () => {
    const { text } = renderBlocks(
      [
        { type: 'heading', text: 'Rentrée' },
        { type: 'paragraph', text: 'Voir [le site](https://ldslouga.sn)' },
        {
          type: 'button',
          label: 'Donner',
          url: 'https://ldslouga.sn/nous-soutenir',
        },
      ],
      context,
    );
    expect(text).toContain('RENTRÉE');
    expect(text).toContain('le site (https://ldslouga.sn/)');
    expect(text).toContain('Donner : https://ldslouga.sn/nous-soutenir');
  });

  it('hides the preheader in the body and appends the signature', () => {
    const { html, text } = renderBlocks(
      [{ type: 'paragraph', text: 'Corps' }],
      {
        ...context,
        preheader: 'Nos nouvelles de juin',
        signature: 'L’équipe LDS',
      },
    );
    expect(html).toMatch(/display:none[^>]*>Nos nouvelles de juin/);
    expect(html).toContain('L’équipe LDS');
    expect(text).toContain('L’équipe LDS');
  });

  it('aligns Arabic to the right', () => {
    const { html } = renderBlocks([{ type: 'paragraph', text: 'مرحبًا' }], {
      ...context,
      locale: 'ar',
    });
    expect(html).toContain('text-align:right');
  });
});
