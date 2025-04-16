#!/bin/bash

# Script à lancer pour augmenter le nombre de fichiers surveillés par inotify
# en cas d'erreur "ENOSPC: System limit for number of file watchers reached" sur Linux
# sur le lancement de "cargo tauri dev"

# Create the configuration file
echo "Creating config file for increasing file watchers limit"
echo "fs.inotify.max_user_watches=524288" | sudo tee /etc/sysctl.d/40-max-user-watches.conf

# Apply the new limit
echo "Applying new limit"
sudo sysctl --system

echo "New limit applied. Current value:"
cat /proc/sys/fs/inotify/max_user_watches

echo "You may need to restart your system for changes to fully take effect."
