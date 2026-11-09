# WSL 2, Alpine, `wslc`, and Docker Desktop

Research checked against Microsoft Learn MCP and the installed `mslearn` CLI on
2026-11-04. This records the machine state and the practices that fit it.

## Installed state

- Windows build `10.0.28120.3302` (Insider/preview channel).
- WSL `3.0.3.0`, kernel `6.18.54.1-1`, WSLg `1.0.79`.
- Alpine Linux `3.24.3`, WSL version 2, default user `aphro` (UID 1001).
- `wslc 3.0.3.0` at `C:\Program Files\WSL\wslc.exe`; that directory is in the
  user's PATH.
- Docker Desktop Engine `29.9.2`, Compose `5.6.1`; Docker Model Runner is
  running. Docker Desktop Kubernetes reports `running`, mode `kind`, one node,
  Kubernetes `1.36.1`.
- `wslc run --rm hello-world` succeeds. Its image is not in Docker Desktop's
  image list: WSL containers and Docker Desktop have separate container
  environments and image stores.

## Practices for this machine

1. Keep WSL current and verify each distro is WSL 2:

   ```powershell
   wsl --update
   wsl --version
   wsl --list --verbose
   wsl --set-version Alpine 2
   ```

2. Use `aphro` for normal work. Use root only for system maintenance, for
   example `wsl -d Alpine -u root -- apk update`. Alpine uses OpenRC by default;
   do not enable systemd unless a workload specifically requires it. The
   default user is set in `/etc/wsl.conf`.

3. Keep Linux-heavy source trees on the WSL Linux filesystem (for example,
   `/home/aphro/src`) when building or scanning from Linux. `/mnt/c/src/yolo-re`
   is appropriate when Windows tools own the checkout, as this workspace does;
   Linux tools can access it, but cross-filesystem operations can be slower.
   Keep each active checkout owned by one toolchain/workflow to avoid duplicate
   watchers and conflicting generated files.

4. Leave `%UserProfile%\.wslconfig` absent until there is a measured need to
   cap memory/CPU, relocate swap, or change networking. Global `.wslconfig`
   affects WSL 2 distributions; per-distro `/etc/wsl.conf` is the place for
   Alpine defaults. Changes to WSL configuration may need `wsl --shutdown`.
   Windows Firewall integration and DNS tunneling are enabled by default in
   current WSL; retain them unless a specific VPN/network issue requires a
   change. Mirrored networking is an option on Windows 11, but is not necessary
   for this NAT-based setup.

5. Choose one container CLI/engine per project:

   ```powershell
   # WSL's built-in container engine
   wslc version
   wslc run --rm hello-world
   wslc container list --all
   wslc image list

   # Docker Desktop engine and Compose
   docker context show
   docker info
   docker compose version
   docker desktop kubernetes status
   ```

   `wslc` is useful for a lightweight WSL-native container workflow. Docker
   Desktop is the selected engine when a project needs Docker Desktop Compose,
   its Kubernetes cluster, or Model Runner. Do not expect `wslc` images or
   containers to be visible to Docker Desktop, or vice versa. Do not start a
   second Docker daemon inside Alpine for projects already using Docker
   Desktop. `wslc`'s configuration is separate; `.wslconfig` does not configure
   WSL containers.

6. Back up important distro data before moving or unregistering a distro:

   ```powershell
   wsl --export Alpine "$env:USERPROFILE\Alpine-backup.tar"
   ```

   Keep the archive on a filesystem with enough free space. `wsl --unregister`
   deletes the distro's data; do not use it as a routine reset.

## Microsoft references

- [Install WSL and manage distributions](https://learn.microsoft.com/windows/wsl/install)
- [WSL file-system performance and cross-OS files](https://learn.microsoft.com/windows/wsl/filesystems)
- [Global `.wslconfig` and per-distro `wsl.conf`](https://learn.microsoft.com/windows/wsl/wsl-config)
- [WSL networking, DNS tunneling, and mirrored mode](https://learn.microsoft.com/windows/wsl/networking)
- [Built-in WSL containers and `wslc`](https://learn.microsoft.com/windows/wsl/tutorials/wsl-containers)
- [Docker Desktop WSL 2 backend](https://docs.docker.com/desktop/features/wsl/)
- [Docker Desktop WSL best practices](https://docs.docker.com/desktop/features/wsl/best-practices/)

## Research tooling

- Microsoft Learn MCP (`microsoft_docs_search` and `microsoft_docs_fetch`) was
  available and used for current WSL configuration, networking, and container
  references.
- The `microsoft-docs` and `microsoft-learn-cli` skills were consulted. The
  Learn CLI is installed as `mslearn` and `mslearn doctor` reports the MCP
  endpoint and tools reachable. `mslearn search` and `mslearn fetch` were also
  used to verify the relevant pages.
- `wslc` is included with WSL starting at version 2.9.3; this machine's WSL
  version is newer and its smoke command passed.
