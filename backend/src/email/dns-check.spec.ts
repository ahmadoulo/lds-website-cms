import { DnsCheckService } from './dns-check.service';

/** The real service with the network replaced by a fixed table of TXT records. */
class Fixed extends DnsCheckService {
  constructor(private readonly records: Record<string, string[][] | Error>) {
    super();
  }
  protected resolveTxt(name: string): Promise<string[][]> {
    const found = this.records[name];
    if (!found)
      return Promise.reject(
        Object.assign(new Error('ENODATA'), { code: 'ENODATA' }),
      );
    if (found instanceof Error) return Promise.reject(found);
    return Promise.resolve(found);
  }
}

describe('DnsCheckService', () => {
  it('reads SPF and DMARC from the sender domain', async () => {
    const report = await new Fixed({
      'ldslouga.sn': [['v=spf1 include:_spf.example.net ~all']],
      '_dmarc.ldslouga.sn': [
        ['v=DMARC1; p=quarantine; rua=mailto:dmarc@ldslouga.sn'],
      ],
    }).check('contact@ldslouga.sn');

    expect(report.domain).toBe('ldslouga.sn');
    expect(report.spf).toMatchObject({ found: true, advice: null });
    expect(report.dmarc).toMatchObject({
      found: true,
      policy: 'quarantine',
      advice: null,
    });
  });

  it('says what to publish when the records are missing', async () => {
    const report = await new Fixed({}).check('contact@ldslouga.sn');

    expect(report.spf.found).toBe(false);
    expect(report.spf.advice).toMatch(/v=spf1/);
    expect(report.dmarc.found).toBe(false);
    expect(report.dmarc.advice).toMatch(/_dmarc\.ldslouga\.sn/);
  });

  it('joins a long TXT record that arrived in chunks', async () => {
    const report = await new Fixed({
      'ldslouga.sn': [
        ['v=spf1 include:a.example.net ', 'include:b.example.net ~all'],
      ],
    }).check('contact@ldslouga.sn');
    expect(report.spf.record).toBe(
      'v=spf1 include:a.example.net include:b.example.net ~all',
    );
  });

  it('flags two SPF records, which receivers reject outright', async () => {
    const report = await new Fixed({
      'ldslouga.sn': [
        ['v=spf1 include:a.example.net ~all'],
        ['v=spf1 include:b.example.net ~all'],
      ],
    }).check('contact@ldslouga.sn');
    expect(report.spf.advice).toMatch(/Plusieurs/);
  });

  it('flags +all, which lets anyone send as the domain', async () => {
    const report = await new Fixed({ 'ldslouga.sn': [['v=spf1 +all']] }).check(
      'a@ldslouga.sn',
    );
    expect(report.spf.advice).toMatch(/\+all/);
  });

  it('notes a DMARC policy that protects nothing yet', async () => {
    const report = await new Fixed({
      '_dmarc.ldslouga.sn': [['v=DMARC1; p=none']],
    }).check('a@ldslouga.sn');
    expect(report.dmarc.policy).toBe('none');
    expect(report.dmarc.advice).toMatch(/observation/);
  });

  it('never claims to have checked DKIM', async () => {
    // Its record sits under a selector only the provider knows; guessing would
    // report a correct domain as broken.
    const report = await new Fixed({}).check('a@ldslouga.sn');
    expect(report.dkim.checkable).toBe(false);
  });

  it('reports nothing, rather than failing, when no sender is configured', async () => {
    const report = await new Fixed({}).check(null);
    expect(report.domain).toBeNull();
    expect(report.spf.found).toBe(false);
  });

  it('treats a lookup failure as "not found", not as a crash', async () => {
    const report = await new Fixed({
      'ldslouga.sn': new Error('SERVFAIL'),
    }).check('a@ldslouga.sn');
    expect(report.spf.found).toBe(false);
  });
});
