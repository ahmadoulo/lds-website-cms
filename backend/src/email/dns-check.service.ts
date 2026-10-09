import { Injectable } from '@nestjs/common';
import { promises as dns } from 'node:dns';

export interface RecordCheck {
  /** Whether a record of this kind was found. */
  found: boolean;
  /** The record as published, so the administrator can compare it. */
  record: string | null;
  /** Something specific to fix, when there is one. */
  advice: string | null;
}

export interface DnsReport {
  domain: string | null;
  spf: RecordCheck;
  dmarc: RecordCheck & { policy: string | null };
  /**
   * DKIM cannot be checked from here. Its record lives under a selector
   * (`<selector>._domainkey.<domain>`) that only the email provider knows, and
   * guessing selectors would report "missing" for a correctly configured
   * domain. The report says so instead of pretending.
   */
  dkim: { checkable: false; advice: string };
  checkedAt: string;
}

/** Each lookup gets a short budget: a diagnostic must not hang the screen. */
const LOOKUP_MS = 4000;

@Injectable()
export class DnsCheckService {
  /**
   * The one network call. A method rather than a constructor parameter so
   * Nest has nothing to inject, and so a test can replace it without the
   * network.
   */
  protected resolveTxt(name: string): Promise<string[][]> {
    return dns.resolveTxt(name);
  }

  async check(fromEmail: string | null): Promise<DnsReport> {
    const domain = fromEmail?.split('@')[1]?.toLowerCase() ?? null;
    const dkim = {
      checkable: false as const,
      advice:
        'DKIM se vérifie avec le sélecteur fourni par votre hébergeur email ' +
        '(enregistrement <sélecteur>._domainkey.' +
        (domain ?? 'votre-domaine') +
        '). Activez la signature DKIM chez lui et publiez la clé qu’il vous donne.',
    };

    if (!domain) {
      const none = { found: false, record: null, advice: null };
      return {
        domain: null,
        spf: none,
        dmarc: { ...none, policy: null },
        dkim,
        checkedAt: new Date().toISOString(),
      };
    }

    const [spfRecords, dmarcRecords] = await Promise.all([
      this.txt(domain),
      this.txt(`_dmarc.${domain}`),
    ]);

    const spf = spfRecords.find((record) => /^v=spf1\b/i.test(record)) ?? null;
    const spfCount = spfRecords.filter((record) =>
      /^v=spf1\b/i.test(record),
    ).length;
    const dmarc =
      dmarcRecords.find((record) => /^v=DMARC1\b/i.test(record)) ?? null;
    const policy =
      dmarc?.match(/\bp=(none|quarantine|reject)\b/i)?.[1]?.toLowerCase() ??
      null;

    return {
      domain,
      spf: {
        found: Boolean(spf),
        record: spf,
        advice: !spf
          ? `Aucun enregistrement SPF sur ${domain}. Ajoutez un TXT « v=spf1 include:<serveur de votre fournisseur> ~all » : votre fournisseur indique la valeur exacte.`
          : spfCount > 1
            ? // Two SPF records is a permanent error for every receiver.
              'Plusieurs enregistrements SPF sont publiés : les serveurs de réception les rejettent tous. Fusionnez-les en un seul.'
            : /\+all\b/i.test(spf)
              ? '« +all » autorise n’importe quel serveur à envoyer en votre nom. Remplacez-le par « ~all » ou « -all ».'
              : null,
      },
      dmarc: {
        found: Boolean(dmarc),
        record: dmarc,
        policy,
        advice: !dmarc
          ? `Aucun enregistrement DMARC. Commencez par un TXT sur _dmarc.${domain} : « v=DMARC1; p=none; rua=mailto:<adresse de rapports> », puis durcissez la politique une fois SPF et DKIM validés.`
          : policy === 'none'
            ? 'DMARC est en observation (p=none) : rien n’est encore protégé. Passez à « quarantine » une fois les rapports propres.'
            : null,
      },
      dkim,
      checkedAt: new Date().toISOString(),
    };
  }

  /** TXT records for a name, joined; nothing (not an error) when none exist. */
  private async txt(name: string): Promise<string[]> {
    try {
      const records = await Promise.race([
        this.resolveTxt(name),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), LOOKUP_MS).unref(),
        ),
      ]);
      // A long TXT record arrives split into 255-byte chunks.
      return records.map((chunks) => chunks.join(''));
    } catch {
      return [];
    }
  }
}
