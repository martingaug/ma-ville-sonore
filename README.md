# Ma ville sonore

Une ville isométrique inspirée de la palette de Santa Ana, construite à partir des écoutes Last.fm de `elleaimeRT`. Le studio de LUVBFK et maitrecorbeau reste présent en permanence.

## Démarrer

Installer Docker Desktop, puis dans le dossier du dépôt :

```powershell
Copy-Item .env.example .env
```

Renseigner `LASTFM_API_KEY` dans `.env` (ne pas remplacer un `.env` déjà configuré), puis :

```sh
docker compose up --build
```

Ouvrir http://localhost:3000. Après la première construction, `docker compose up` suffit. Après une modification du code, relancer avec `--build`.

## Fonctionnement

- `server.mjs` : serveur HTTP Node.js sans dépendance externe. Seul ce serveur interroge Last.fm via `user.getRecentTracks`.
- `public/index.html` : structure de l'interface.
- `public/style.css` : présentation et adaptation mobile.
- `public/app.js` : regroupement des écoutes, dessin SVG isométrique, zoom, déplacement, recherche et fiches.
- `Dockerfile` et `compose.yaml` : lancement et volume persistant de cache.

Le navigateur ne charge que des ressources de notre serveur. Les liens Spotify et les sources ne sont ouverts que si le visiteur clique dessus. Aucune image ni police externe n'est téléchargée automatiquement.

La clé reste dans une variable d'environnement du serveur. `.env` est exclu de Git et du contexte Docker. Le secret partagé Last.fm n'est pas utilisé.

## Cache et pannes

Le serveur conserve les résultats 5 minutes en mémoire et sur disque dans le volume `music-cache`. Les demandes simultanées partagent un même appel Last.fm. Après un échec, il attend une minute avant de réessayer et renvoie les dernières données avec un message. Sans aucune donnée disponible, le studio et un message restent affichés.

## Règles visuelles et limites de cette première version

La hauteur dépend du nombre d'écoutes terminées : `2 + min(7, floor(sqrt(nombre) * 1.7))` étages. Le morceau en cours n'est pas comptabilisé comme une écoute terminée. Le filtre 24 h s'applique aux données chargées, pas à un historique complet.

L'origine influence la façade ; le genre influence l'usage et l'enseigne du lieu. Sept portraits sont documentés avec leurs sources dans `profiles` : Will Paquin, LUCKI, PLK, Internet Girl, La Fève, Peach Pit et Juls. Les autres artistes apparaissent dans des bâtiments provisoires, explicitement signalés. L'enrichissement des portraits est éditorial et n'est pas automatique à ce stade. Les bâtiments sont des interprétations, pas les domiciles réels.

Les données sont limitées aux 200 derniers titres retournés par Last.fm. Un artiste absent de cette fenêtre disparaît de la ville, sauf les deux artistes du studio. La ville est redessinée selon le classement actuel : les adresses ne sont pas encore permanentes. Il s'agit d'une illustration SVG en perspective isométrique, pas d'une scène 3D librement orientable.

## Vérifications pour la démonstration

1. Ouvrir la page et l'onglet Réseau : ressources locales et `/api/recent-tracks` uniquement.
2. Recharger deux fois dans les 5 minutes : un seul `Appel Last.fm` dans les logs pour un cache initialement vide ; zéro si le cache est déjà frais.
3. Cliquer un artiste documenté, puis un provisoire, et expliquer la distinction.
4. Utiliser la recherche, le filtre 24 h, le zoom et le studio permanent.
5. Pour simuler une panne après un premier chargement, déconnecter Internet, attendre l'expiration du cache et actualiser : données conservées et message. Reconnecter ensuite.
6. Vérifier `git check-ignore .env` avant tout commit. Ne jamais publier une capture contenant la clé.

## Mise à jour V3 : portraits automatiques

Le serveur appelle `artist.getInfo` pour les artistes présents dans les écoutes. Les tags déterminent une famille musicale. Une liste limitée de villes est reconnue uniquement après une formulation explicite (« from London », « born in Chicago », etc.). Cette extraction est une heuristique, pas une recherche exhaustive : les homonymes, biographies multiples et formulations non prises en charge peuvent demander une correction. Les sept portraits éditoriaux gardent la priorité. Les fiches automatiques sont signalées « à vérifier ». Les palettes sont déterministes selon le nom.

Les artistes sont chargés séquentiellement, avec 350 ms entre les demandes. Le serveur déduplique les demandes identiques et conserve les portraits pendant 24 h sur le volume de données (nouvel essai après une minute en cas d'échec Last.fm). Une recherche déclenchée par un nouvel artiste est donc automatique, sans intervention éditoriale obligatoire.

### Photos officielles Spotify

Ajouter à son `.env` existant, sans publier les valeurs :

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Ces identifiants proviennent d'une application créée dans le tableau de bord Spotify for Developers. L'accès dépend des conditions et du mode d'accès Spotify de l'application. Le flux client credentials s'effectue exclusivement côté serveur. Le serveur recherche une correspondance de nom exacte ; en cas d'ambiguïté il n'affiche pas de photo. Les deux artistes du studio utilisent les identifiants Spotify fournis par le propriétaire du projet. Les autres correspondances restent heuristiques et doivent être vérifiées.

La photo est obtenue depuis l'API officielle puis servie par `/api/artist-photo`. Les téléchargements sont limités au CDN Spotify autorisé, sans redirection, à 5 Mo et aux formats JPEG, PNG ou WebP. Les images sont mises en cache 24 h. La fiche crédite Spotify et renvoie au profil original ; aucun appel externe automatique ne part du navigateur. Une absence de droits, de configuration, d'image ou un quota dépassé laisse un emplacement explicite.

Après installation : `docker compose up --build`. Ne pas remplacer le `.env` déjà renseigné par le modèle.

### Affichage V2/V3

La ville est divisée en quartiers de huit artistes et un studio central. Les flèches parcourent tous les quartiers ; la recherche filtre la carte. La hauteur est maintenant plafonnée entre deux et cinq étages pour les immeubles, et les salles de spectacle/maisons gardent une hauteur adaptée à leur forme. Les noms sont dessinés sur des panneaux visibles au premier plan.

Validation V3 : contrôles de syntaxe Node.js ; tests simulés de genre, extraction géographique, cache, déduplication et configuration Spotify absente. Les photos Spotify réelles nécessitent les identifiants et restent à valider après configuration.
## V4 : pochettes et monuments

Les fiches utilisent désormais les vraies pochettes renvoyées par `user.getRecentTracks`. Aucun identifiant Spotify n'est nécessaire pour les afficher. Les images sont téléchargées uniquement par le serveur depuis les domaines Last.fm autorisés, avec timeout, limite de taille, formats contrôlés et cache mémoire 24 h. Le navigateur charge `/api/cover?id=...` sur son propre serveur. Les anciens caches sans pochettes sont renouvelés au lancement. Sans image fournie par Last.fm, un message est affiché ; aucune fausse pochette n'est générée.

Les références parisiennes utilisent une tour Eiffel stylisée, Londres une tour-horloge, New York une tour à gradins. Ces monuments sont des symboles visuels et ne prétendent pas être des lieux fréquentés par les artistes. Les artistes sans origine identifiée reçoivent une variante décorative déterministe, sans attribution géographique. La grille est passée de 220 à 290 unités par parcelle. Les formes proviennent de familles de modèles : ce ne sont pas encore des illustrations entièrement uniques dessinées à la main pour chaque artiste.

Validation : syntaxe JavaScript et rendu de la ville vérifiés. L'ancien serveur local ne renvoyant pas les images, le chargement réel des pochettes doit être vérifié après reconstruction Docker avec le nouveau serveur.