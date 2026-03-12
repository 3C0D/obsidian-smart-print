# Problème d'impression de la sélection après refactorisation

## Contexte

Lors du commit `859907a` (refactor(print): unify print capture strategy), nous avons unifié tous les modes d'impression (Basic, Standard, Advanced) en un seul mode automatique avec détection intelligente de la meilleure méthode de capture.

Cette refactorisation a simplifié considérablement l'architecture mais a introduit une régression : **l'impression de la sélection ne fonctionne plus correctement**.

## Ancienne architecture (avant 859907a)

### Trois modes d'impression distincts

1. **Basic Print** (`basicPrint.ts`)
   - Impression simple via Printd
   - Pas de prévisualisation
   - Utilisé sur mobile

2. **Standard Print** (`standardPrint`)
   - Rendu markdown → HTML
   - Ouverture dans le navigateur système
   - Desktop uniquement

3. **Advanced Print** (`advancedPrint.ts`)
   - Capture DOM complète de la prévisualisation
   - Rendu le plus fidèle (inclut Mermaid, LaTeX, etc.)
   - Desktop uniquement

### Gestion de la sélection dans l'ancienne architecture

#### Dans `normalCapturePreview.ts` (Basic/Standard)

```typescript
export async function contentToHTML(
    app: App,
    settings: SmartPrintPluginSettings,
    isSelection: boolean = false,
    file?: TFile,
): Promise<HTMLElement | null> {
    if (isSelection) {
        const activeView = app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice("No active note.");
            return null;
        }

        const selection = activeView.editor.getSelection();
        if (!selection) {
            new Notice("No text selected.");
            return null;
        }

        // Rendu simple du texte sélectionné
        return await generateHTML(app, settings, selection);
    }
    // ... reste du code
}
```

**Méthode** : 
- Récupération du texte sélectionné via `activeView.editor.getSelection()`
- Rendu markdown simple via `MarkdownRenderer.render()`
- Pas de capture DOM complexe
- **Limitation** : Pas de rendu avancé (Mermaid, LaTeX, etc.)

#### Dans `advancedCapturePreview.ts` (Advanced)

```typescript
export async function getRenderedContent(
    app: App,
    settings: SmartPrintPluginSettings,
    isSelection: boolean = false,
): Promise<HTMLElement | null> {
    // ...
    
    if (isSelection) {
        const selection = window.getSelection();
        
        if (!selection || selection.rangeCount === 0) {
            new Notice("No text selected");
            return null;
        }

        const sizer = document.createElement("div");
        sizer.className = "markdown-preview-sizer";

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        if (fragment.childNodes.length === 0) {
            new Notice("Selection appears to be empty");
            return null;
        }

        // Clone des nœuds DOM sélectionnés
        Array.from(fragment.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const p = document.createElement("p");
                p.appendChild(node.cloneNode(true));
                sizer.appendChild(p);
            } else {
                sizer.appendChild(node.cloneNode(true));
            }
        });

        container.appendChild(sizer);
    }
    // ...
}
```

**Méthode** :
- Récupération de la sélection DOM via `window.getSelection()`
- Clone du fragment DOM sélectionné avec `range.cloneContents()`
- Préservation de la structure HTML rendue
- **Avantage** : Capture le rendu visuel exact (Mermaid, LaTeX, etc.)
- **Limitation** : Nécessite que le contenu soit déjà rendu dans la prévisualisation

**Note importante dans le code** :
```typescript
// Not working !
// Note: To test an alternative solution for selection printing,
// modify the handlePrint calls in main.ts from (false, true) to (true, true)
// This will enable advanced print mode in the modal for selection operations
```

Cette note indique que **la méthode avancée pour la sélection ne fonctionnait pas correctement** même avant la refactorisation.

## Nouvelle architecture (après 859907a)

### Mode unifié avec stratégie automatique

Le fichier `captureStrategy.ts` remplace les trois modes par une fonction unique `getBestContent()` qui :

1. Tente d'abord la capture DOM avancée (plus fidèle)
2. Se rabat sur le rendu HTML standard en cas d'échec

### Gestion actuelle de la sélection

```typescript
export async function getBestContent(
    app: App,
    settings: SmartPrintPluginSettings,
    isSelection: boolean = false,
    file?: TFile,
): Promise<HTMLElement | null> {
    if (isSelection) {
        const activeView = app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return null;
        
        const selection = activeView.editor.getSelection();
        if (!selection) {
            new Notice("No text selected.");
            return null;
        }

        // Rendu direct sans pipeline complexe
        const container = document.createElement("div");
        container.className = "markdown-preview-view";
        const sizer = container.createDiv("markdown-preview-sizer");
        
        const component = new Component();
        component.load();
        try {
            await MarkdownRenderer.render(
                app,
                selection,
                sizer,
                activeView.file?.path ?? "",
                component,
            );
        } catch {
            // Fallback : paragraphes en texte brut
            sizer.empty();
            selection.split("\n\n").filter(Boolean).forEach((para) => {
                sizer.createEl("p").textContent = para;
            });
        }
        component.unload();
        return container as HTMLElement;
    }
    // ... reste du code
}
```

**Problème identifié** :
- La sélection utilise uniquement `MarkdownRenderer.render()` sur le texte brut
- Pas de tentative de capture DOM avancée
- Le fallback en cas d'erreur crée des paragraphes en texte brut
- **Résultat** : Perte de tout le rendu avancé (Mermaid, LaTeX, formatage complexe)

## Pourquoi la sélection est problématique

### Contrainte fondamentale

Quand du texte est sélectionné dans l'éditeur :
- On ne sait pas où se trouve ce texte dans le document rendu
- La correspondance éditeur ↔ prévisualisation n'est pas triviale
- Les éléments complexes (Mermaid, LaTeX) sont rendus différemment

### Solutions tentées (anciennes)

1. **Mode Basic/Standard** : Rendu markdown simple du texte sélectionné
   - ✅ Fonctionne pour le texte simple
   - ❌ Pas de rendu avancé

2. **Mode Advanced** : Clone du fragment DOM sélectionné
   - ✅ Préserve le rendu visuel
   - ❌ Ne fonctionnait pas correctement (voir note dans le code)
   - ❌ Nécessite une sélection dans la prévisualisation, pas l'éditeur

## Solution minimale à implémenter

### Objectif

Restaurer une impression minimale de la sélection qui :
- Fonctionne de manière fiable
- Imprime le texte sélectionné avec un formatage de base
- N'essaie pas de rendre les éléments complexes (Mermaid, LaTeX, etc.)

### Approche recommandée

Utiliser la méthode de l'ancien `normalCapturePreview.ts` :

```typescript
if (isSelection) {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
        new Notice("No active note.");
        return null;
    }

    const selection = activeView.editor.getSelection();
    if (!selection) {
        new Notice("No text selected.");
        return null;
    }

    // Rendu markdown simple et fiable
    return await generateHTML(app, settings, selection);
}
```

### Ce qui sera imprimé

- ✅ Texte formaté (gras, italique, etc.)
- ✅ Listes
- ✅ Titres
- ✅ Liens
- ✅ Code inline et blocs de code
- ✅ Citations
- ❌ Diagrammes Mermaid (non rendus)
- ❌ Formules LaTeX (non rendues)
- ❌ Callouts complexes (rendu basique)
- ❌ Tableaux complexes (rendu basique)

### Modifications nécessaires

1. **Dans `captureStrategy.ts`** :
   - Simplifier la gestion de la sélection
   - Utiliser `contentToHTML()` pour les sélections
   - Supprimer le try/catch avec fallback texte brut

2. **Dans `normalCapturePreview.ts`** :
   - S'assurer que `generateHTML()` gère correctement les strings
   - Vérifier que le rendu markdown fonctionne pour les sélections

3. **Tests à effectuer** :
   - Sélection de texte simple
   - Sélection avec formatage (gras, italique, listes)
   - Sélection avec code
   - Sélection avec liens
   - Sélection contenant Mermaid/LaTeX (doit échouer gracieusement)

## Conclusion

La refactorisation a unifié les modes d'impression mais a cassé la sélection en essayant d'utiliser `MarkdownRenderer.render()` directement sur le texte sélectionné avec un fallback texte brut.

La solution est de revenir à l'approche de l'ancien `normalCapturePreview.ts` qui utilisait `generateHTML()` pour rendre le markdown sélectionné de manière simple mais fiable.

Cette approche accepte la limitation : **l'impression de sélection ne rendra pas les éléments complexes**, ce qui est un compromis acceptable vu la complexité de mapper une sélection éditeur vers le DOM rendu.
