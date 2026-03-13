menu folder print

> Dans le plugin Obsidian "Smart Print", ajouter une modal intermédiaire lors de l'impression d'un dossier (`printFolder` dans `folderPrint.ts`) pour demander à l'utilisateur s'il veut combiner les notes ou les séparer par sauts de page, plutôt que de toujours utiliser `plugin.settings.combineFolderNotes`. S'inspirer de `PrintModeModal.ts` pour le style de la modal. Le choix ne modifie pas le setting persisté, il s'applique uniquement pour l'impression en cours.
