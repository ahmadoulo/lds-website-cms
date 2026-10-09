# Emails, newsletter et campagnes

Ce document explique comment le site envoie ses emails, comment le mettre en
service, et ce que chaque écran de **Communication** permet de faire. Il
s'adresse à l'équipe qui administre le site et à la personne qui le déploie.

---

## Mise en service, dans l'ordre

1. **Sur le serveur** — lancez `./scripts/setup-env.sh`, puis
   `docker compose up -d`. Le script crée `EMAIL_ENCRYPTION_KEY` s'il manque et
   la conserve ensuite. Le backend doit être *recréé* (pas seulement
   *running*) pour la recevoir.
2. **Communication → Configuration email**
   - serveur, port, sécurité, identifiant et mot de passe, fournis par votre
     hébergeur email ;
   - adresse et nom d'expéditeur ;
   - **adresse publique du site** — pré-remplie avec l'adresse que vous
     utilisez ; vérifiez qu'il s'agit bien de `https://ldslouga.sn` et
     enregistrez ;
   - adresse de réception des demandes de contact ;
   - enregistrez, puis **Tester la connexion**, puis **Envoyer un email de
     test** à votre propre adresse.
3. **Authentification du domaine** (même écran, bouton *Vérifier*) — voir la
   section DNS ci-dessous.
4. Cochez **Activer l'envoi des emails** et enregistrez. Tant que ce n'est pas
   fait, rien ne part : les emails attendent sans être perdus.
5. **Lien vers la politique de confidentialité** — à renseigner avant
   d'ouvrir la newsletter (voir *Points à valider*).

Le formulaire d'inscription à la newsletter n'apparaît sur le site qu'une fois
l'envoi activé et l'adresse du site renseignée.

---

## Ce qui part automatiquement

| Événement | Email | Destinataire | Désactivable |
| --- | --- | --- | --- |
| Un visiteur écrit via le formulaire | Accusé de réception | le visiteur, dans sa langue | oui |
| Un visiteur écrit via le formulaire | Notification interne | adresse de réception des demandes | oui |
| Quelqu'un demande la newsletter | Confirmation d'inscription | la personne | **non** — c'est le double opt-in |
| Quelqu'un confirme | Bienvenue | la personne | oui (désactivé par défaut) |
| Quelqu'un confirme | Nouvel abonné | adresse des alertes | oui (désactivé par défaut) |
| Une campagne se termine | Campagne terminée | adresse des alertes | oui |

Les textes se modifient dans **Modèles d'emails**, en français et en arabe.
Un modèle sans texte arabe est envoyé en français.

Il n'existe pas d'alerte email en cas de panne du serveur d'envoi : elle
partirait par le serveur en panne. Les échecs s'affichent dans le **tableau de
bord** de la Communication.

---

## Newsletter

- **Double opt-in.** Une inscription n'est active qu'après un clic sur le
  lien de confirmation (valable 48 h, à usage unique). Seules les adresses
  confirmées reçoivent des campagnes.
- **Désinscription** en un clic depuis chaque newsletter, sans compte. Les
  messageries (Gmail, Yahoo, Outlook…) affichent aussi leur propre bouton de
  désinscription, grâce aux en-têtes `List-Unsubscribe`.
- **Écrire via le formulaire de contact n'inscrit personne** à la newsletter.
- Le formulaire ne dit jamais si une adresse est déjà inscrite, et n'envoie pas
  plus d'un email de confirmation toutes les dix minutes à la même adresse.
- **Export CSV, effacement et import** sont réservés au super administrateur
  et inscrits au journal d'activité. Un import n'ajoute jamais une adresse
  déjà connue — même désinscrite.

## Campagnes

1. Rédigez avec des blocs : titre, paragraphe (**gras** et liens), liste,
   image de la médiathèque, bouton, séparateur. L'aperçu montre l'email tel
   qu'il partira, en largeur ordinateur ou téléphone.
2. Enregistrez, puis **envoyez-vous un test**.
3. **Envoyer…** affiche un récapitulatif (objet, expéditeur, langue, audience,
   nombre exact de destinataires). L'envoi exige de cocher la confirmation.
   Si l'audience a changé entre-temps, l'envoi est refusé et le nouveau nombre
   affiché.
4. L'envoi se poursuit en arrière-plan, même écran fermé, au rythme réglé dans
   la configuration. Il peut être **suspendu**, **repris** ou **annulé**.

**Ce que signifient les chiffres.** *Accepté par le serveur* veut dire que
votre serveur d'envoi a pris l'email en charge — **pas** qu'il est arrivé dans
la boîte de réception ; seul le destinataire le sait. Les ouvertures et les
clics ne sont pas mesurés : il faudrait pour cela des images espions et des
liens réécrits.

---

## DNS : SPF, DKIM, DMARC

Ces enregistrements se configurent **chez l'hébergeur du nom de domaine**
`ldslouga.sn`. Le site ne modifie jamais le DNS ; le bouton *Vérifier* lit ce
qui est publié.

| Enregistrement | Où | Valeur |
| --- | --- | --- |
| SPF | TXT sur `ldslouga.sn` | `v=spf1 include:<serveur de votre fournisseur email> ~all` — la valeur exacte est donnée par le fournisseur. **Un seul** enregistrement SPF. |
| DKIM | TXT sur `<sélecteur>._domainkey.ldslouga.sn` | la clé publique fournie par votre fournisseur, après avoir activé la signature DKIM chez lui |
| DMARC | TXT sur `_dmarc.ldslouga.sn` | commencez par `v=DMARC1; p=none; rua=mailto:<adresse de rapports>`, puis passez à `p=quarantine` une fois SPF et DKIM validés |

DKIM ne peut pas être vérifié depuis le site : son enregistrement porte un
sélecteur que seul le fournisseur connaît.

L'adresse d'expédition doit appartenir au domaine couvert par SPF et DKIM. Une
adresse `@gmail.com` ou d'un autre domaine que celui du compte SMTP sera
refusée ou finira en indésirables ; l'écran de configuration le signale.

**Rebonds et plaintes.** Le site ne les détecte pas : SMTP seul ne les
remonte pas, et aucun retour du fournisseur n'est branché. Une adresse qui
n'existe plus apparaît en *Échec* lorsque le serveur la refuse immédiatement ;
un rebond différé n'apparaît pas.

---

## Sécurité et données

- Le mot de passe SMTP est chiffré (AES-256-GCM, clé `EMAIL_ENCRYPTION_KEY`),
  jamais renvoyé par l'API, jamais affiché, retiré de toutes les erreurs.
- La configuration SMTP n'est pas exposée publiquement (elle n'est pas dans
  les réglages servis aux visiteurs).
- Les liens des emails utilisent l'adresse publique **configurée**, jamais
  celle de la requête : un visiteur ne peut pas y injecter un autre domaine.
- Les valeurs saisies par les visiteurs sont échappées dans le HTML ; un
  retour à la ligne dans un en-tête est refusé.
- **Conservation** : le contenu d'un email terminé est effacé après **90
  jours**. L'historique garde le destinataire, l'objet, le statut et les dates.
  Un email dont le contenu a été effacé ne peut plus être relancé.

## Fonctionnement technique

- La file d'envoi est une table PostgreSQL (`EmailMessage`), pas Redis : aucun
  conteneur supplémentaire, et elle survit aux redémarrages.
- Le backend la parcourt toutes les 15 secondes, par lots, au débit
  configuré. Erreurs temporaires : jusqu'à 5 tentatives sur environ 3 heures.
  Erreurs définitives (adresse refusée…) : aucune nouvelle tentative.
- Un envoi interrompu par un redémarrage est marqué en échec, **pas renvoyé
  automatiquement** : le serveur l'a peut-être déjà accepté. Relancez-le à la
  main après vérification.
- Un accusé de réception de plus de 3 jours (après une longue coupure) est
  annulé plutôt qu'envoyé en retard.
- `EMAIL_WORKER_DISABLED=true` empêche un conteneur d'envoyer.

---

## Points à valider avant d'ouvrir la newsletter

- **Politique de confidentialité** : le formulaire d'inscription y renvoie.
  Le texte doit être fourni par l'association ; le site ne le rédige pas.
- **Textes arabes** des emails et des écrans : premier jet, à faire relire.
- **Un vrai test** de bout en bout avec le serveur SMTP réel : inscription,
  email de confirmation, confirmation, campagne de test, désinscription.
