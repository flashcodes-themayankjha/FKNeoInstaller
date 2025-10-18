# FkNeoInstaller-cli

<p align="center">
  <a href="https://github.com/flashcodes-themayankjha/FkNeoInstaller-cli">
    <img src="https://img.shields.io/github/stars/flashcodes-themayankjha/FkNeoInstaller-cli.svg?style=social" alt="GitHub Stars">
  </a>
  <a href="https://www.npmjs.com/package/FkNeoInstaller-cli">
    <img src="https://img.shields.io/npm/v/FkNeoInstaller-cli.svg" alt="npm version">
  </a>
</p>

<p align="center">
  <b>Dynamic Neovim setup wizard CLI.</b>
</p>

---

## Why FkNeoInstaller-cli?

`FkNeoInstaller-cli` is a command-line interface tool designed to simplify the setup and management of your Neovim configuration. Whether you're a seasoned Neovim user or just starting, `FkNeoInstaller-cli` helps you get up and running with a powerful and customized Neovim environment in minutes.

## Features

- **Interactive Setup:** A user-friendly wizard to guide you through the setup process.
- **Pre-built Configurations:** Choose from a selection of pre-built Neovim configurations.
- **Clean and Reset:** Easily clean up your Neovim setup and restore backups.
- **Authentication:** Securely authenticate with GitHub to access private configurations.

## Installation

Install `FkNeoInstaller-cli` globally using npm:

```bash
npm install -g FkNeoInstaller-cli
```

## Usage

Once installed, you can start the interactive CLI by running:

```bash
fkneo
```

This will launch the `FkNeoInstaller-cli` and you can start using the commands.

## Commands

| Command      | Description                                                 |
|--------------|-------------------------------------------------------------|
| `help`       | Print help info                                             |
| `setup`      | Start Neovim configuration setup                            |
| `clean`      | Remove prebuilt configs, aliases, and restore backups       |
| `reset-auth` | Clear saved GitHub credentials                              |
| `quit`       | Exit the CLI                                                |
| `exit`       | Same as quit                                                |

## Configuration

`FkNeoInstaller-cli` stores its configuration in a file named `config.json` in your system's default configuration directory. To clear the configuration, you can use the `reset-auth` command.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.