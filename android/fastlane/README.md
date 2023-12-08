fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android build

```sh
[bundle exec] fastlane android build
```

Build Releasable APK

### android play_store_upload

```sh
[bundle exec] fastlane android play_store_upload
```

Deploy a new version to the Google Play

### android huawei_store_upload

```sh
[bundle exec] fastlane android huawei_store_upload
```

Deploy the new version to Huawei App Gallery

### android promote_to_beta

```sh
[bundle exec] fastlane android promote_to_beta
```

Promote Internal Testing build to Beta

### android promote_to_public

```sh
[bundle exec] fastlane android promote_to_public
```

Promote Internal Testing build to Public

### android public_phased_percent

```sh
[bundle exec] fastlane android public_phased_percent
```

Phased Public Rollout

### android build_e2e

```sh
[bundle exec] fastlane android build_e2e
```

Build for end to end testing

### android browserstack

```sh
[bundle exec] fastlane android browserstack
```

End to end testing on browserstack

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
