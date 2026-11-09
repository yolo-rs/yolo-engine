---
name: niers-vfs
description: Système de fichiers virtuel (Nie VFS), manipulation d'archives G4 Level-5 (.g4md, .g4mg, .g4pkm), RAM mounting et extraction 3D pour Inazuma Eleven VR.
---

# Nie VFS — Virtual File System & Level-5 Engine

Ce skill permet d'inspecter, monter et manipuler les conteneurs et archives virtuelles du moteur Nie et d'Inazuma Eleven VR :

- Détection des conteneurs propriétaires Level-5 G4 : `.g4md` (modèles), `.g4mg` (géométrie), `.g4pkm` (packages).
- Montage virtuel en mémoire vive (RAM-backed VFS) et décompression lz4/oodle.
- Navigation et recherche d'offsets sans extraction physique sur le disque.
- Intégration directe avec Inacord et `nie.exe`.
