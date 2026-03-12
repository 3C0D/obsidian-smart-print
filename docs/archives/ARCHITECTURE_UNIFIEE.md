# Architecture Unifiée — Obsidian Smart Print

**Date:** 2024-12-19  
**Version:** Post-unification

---

## 🎯 Problème Résolu

### Avant : Duplication de Pipeline

Le plugin avait **deux pipelines de capture distincts** :

```
Pipeline "Normal" (normalCapturePreview.ts)
└─ MarkdownRenderer.render()
   └─ Re-render via API Obsidian
   └─ ❌ Perd : Mermaid, Dataview, MetaBind, plugins dynamiques

Pipeline "Advanced" (advancedCapturePreview.ts)
└─ Snapshot du DOM live
   └─ Capture ce qui est réellement affiché
   └─ ✅ Garde : Tout ce que l'utilisateur voit
```

**Problème :** L'utilisateur devait choisir entre "Basic", "Standard", "Advanced" sans comprendre la différence technique.

### Après : Pipeline Unifié

```
getBestContent() (captureStrategy.ts)
├─ Essaie : Capture DOM live (advancedCapturePreview)
│   └─ ✅ Succès → Rendu fidèle avec tout
└─ Fallback : MarkdownRenderer (normalCapturePreview)
    └─ ⚠️ Si échec → Rendu basique mais fonctionnel
```

**Résultat :** Un seul bouton "Print" qui utilise automatiquement la meilleure méthode.

---

## 📐 Nouvelle Architecture

### Flux Simplifié

```
User clicks Print
    ↓
handlePrint()
    ├─ Mobile? → unifiedPrint() → Printd
    └─ Desktop?
        ├─ useModal? → PrintModeModal (options only)
        └─ unifiedPrint()
            ├─ getBestContent() → Capture unifiée
            ├─ generatePrintStyles() → CSS
            └─ getBestPrintEngine()
                ├─ Browser → PrintManager
                └─ Printd → openPrintModal/directPrint
```

### Fichiers Clés

#### `captureStrategy.ts` 🆕
**Rôle :** Stratégie unifiée de capture de contenu

```typescript
getBestContent(app, settings, isSelection, file?)
  → Essaie DOM live, fallback sur MarkdownRenderer

getBestPrintEngine(settings, isMobile)
  → "browser" ou "printd" selon plateforme et préférences
```

#### `main.ts` ✅ Simplifié
**Avant :** 3 méthodes (`basicPrint`, `standardPrint`, `advancedPrint`)  
**Après :** 1 méthode (`unifiedPrint`)

**Supprimé :**
- `preparePrintContent()` (remplacé par `getBestContent`)
- `standardPrint()` (logique fusionnée)
- `basicPrint()` (logique fusionnée)

#### `PrintModeModal.ts` ✅ Simplifié
**Avant :** 3 boutons (Basic, Standard, Advanced)  
**Après :** 1 bouton (Print)

**Garde :**
- ✅ Print Title
- ✅ Show Metadata
- ✅ Page Breaks at HR
- ✅ Print in color
- ✅ Font family
- ✅ Font size + auto-sync

**Supprime :**
- ❌ Choix du mode d'impression (détail d'implémentation)

---

## 🔄 Stratégie de Capture

### Ordre de Priorité

1. **DOM Live Capture** (advancedCapturePreview)
   - ✅ Mermaid diagrams
   - ✅ Dataview queries
   - ✅ MetaBind fields
   - ✅ Callouts avec icônes
   - ✅ Plugins dynamiques
   - ⚠️ Nécessite preview mode actif

2. **Fallback : MarkdownRenderer** (normalCapturePreview)
   - ✅ Markdown standard
   - ✅ Tables, listes, code blocks
   - ✅ Images, liens
   - ❌ Plugins dynamiques non rendus

### Cas Spéciaux

#### Sélection de Texte
```typescript
if (isSelection) {
    // Advanced mode broken for selections
    return contentToHTML(); // Fallback direct
}
```

**Raison :** `window.getSelection()` ne fonctionne pas correctement avec le DOM preview. Nécessite refonte future.

#### Mode Debug
```typescript
if (settings.debugMode) {
    console.log("Attempting advanced DOM capture");
    console.log("Fallback to standard renderer");
}
```

Tous les logs sont conditionnels pour éviter le spam en production.

---

## 🎨 Moteurs d'Impression

### Printd (Electron)
**Utilisé quand :**
- Mobile (toujours)
- Desktop + `useBrowserPrint: false`

**Avantages :**
- ✅ Fonctionne partout
- ✅ Rapide
- ✅ Pas de fichier temporaire

**Limites :**
- ⚠️ Rendu Electron (moins fidèle)
- ⚠️ Options d'impression limitées

### Browser Print
**Utilisé quand :**
- Desktop + `useBrowserPrint: true`

**Avantages :**
- ✅ Rendu navigateur (très fidèle)
- ✅ Options d'impression complètes
- ✅ Export PDF natif

**Limites :**
- ❌ Desktop uniquement (Node.js requis)
- ⚠️ Fichier temporaire créé

---

## 📊 Comparaison Avant/Après

### Complexité du Code

| Métrique | Avant | Après | Delta |
|----------|-------|-------|-------|
| Méthodes print dans main.ts | 4 | 1 | -75% |
| Boutons dans modal | 3 | 1 | -66% |
| Décisions utilisateur | 3 modes | Options | Simplifié |
| Lignes de code main.ts | ~180 | ~120 | -33% |

### Expérience Utilisateur

| Aspect | Avant | Après |
|--------|-------|-------|
| **Choix à faire** | "Basic, Standard ou Advanced ?" | "Print" |
| **Compréhension** | Termes techniques | Options claires |
| **Résultat** | Dépend du choix | Toujours optimal |
| **Erreurs** | Mauvais mode = mauvais rendu | Fallback automatique |

---

## 🔮 Améliorations Futures

### Court Terme

1. **Fixer la sélection en mode avancé**
   - Utiliser `getSelection()` sur la preview
   - Ou créer un range custom dans le DOM capturé

2. **Améliorer le fallback**
   - Détecter pourquoi la capture DOM échoue
   - Logger les raisons en debug mode

### Moyen Terme

3. **Unifier les métadonnées**
   - Extraire `addMetadataToContent` en utility
   - Partager entre normalCapture et advancedCapture

4. **Cache de capture**
   - Éviter de re-capturer si le contenu n'a pas changé
   - Utile pour réimpressions rapides

### Long Terme

5. **Mode hybride**
   - Capturer le DOM live
   - Mais permettre édition avant impression
   - Nécessite un éditeur WYSIWYG temporaire

---

## 🧪 Tests Requis

### Scénarios Critiques

- [ ] Print note simple (texte + markdown)
- [ ] Print note avec Mermaid diagram
- [ ] Print note avec Dataview query
- [ ] Print note avec callouts
- [ ] Print selection (devrait fallback)
- [ ] Print folder (devrait utiliser unified)
- [ ] Mobile print (devrait utiliser Printd)
- [ ] Desktop print avec browser enabled
- [ ] Desktop print avec browser disabled

### Cas Limites

- [ ] Note vide
- [ ] Note très longue (>10000 lignes)
- [ ] Note avec images externes
- [ ] Note avec LaTeX/MathJax
- [ ] Preview mode désactivé (devrait fallback)

---

## 📝 Migration Notes

### Pour les Utilisateurs

**Aucun changement visible** sauf :
- ✅ Le modal est plus simple (1 bouton au lieu de 3)
- ✅ Le rendu est meilleur automatiquement
- ✅ Moins de choix = moins d'erreurs

### Pour les Développeurs

**Fichiers supprimés :** Aucun (backward compatibility)  
**Fichiers ajoutés :** `captureStrategy.ts`  
**Fichiers modifiés :**
- `main.ts` (logique simplifiée)
- `PrintModeModal.ts` (UI simplifiée)

**Breaking changes :** Aucun  
**API changes :** Aucun (tout est interne)

---

## 🎓 Leçons Apprises

### Ce qui a fonctionné

1. **Capture DOM live** est la seule vraie solution pour les plugins dynamiques
2. **Fallback automatique** évite les erreurs utilisateur
3. **Simplifier l'UI** améliore l'expérience sans perdre de fonctionnalités

### Ce qui reste à améliorer

1. **Sélection en mode avancé** nécessite une approche différente
2. **Documentation utilisateur** doit expliquer pourquoi certains éléments ne s'impriment pas
3. **Tests automatisés** seraient utiles pour valider les fallbacks

---

**Dernière mise à jour :** 2024-12-19  
**Prochaine révision :** Après tests complets de la nouvelle architecture
