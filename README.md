# version-power

Github action to automatically create and update version files in a standardized way.

I would like to publish this for internal use. Or perhaps we could open source it. To make it easier to distribute.
To start using

** stable version is 0.4.15 use that tag **

    Tag your repository main/master branch with the current version: ''' git tag -a v1.4 -m "my version 1.4" git push origin v1.4 '''
    Copy the entirety of the .github folder into the root of your repo.
    Make necessary changes to the version workflow file. If you have the _ _ version _ _.py file in the root of your project, no changes should be needed
    If you want to disable the changelog PR template, remove the pull_request_template.md file.

Design

There is three different actions. The combination of them in a workflow is what creates the versioning magic.
version-power

Is the most complex action as it contains all logic for calculating a correct semantic version for your commit.
On push to a feature branch

Creates a version based on the version file in the branch. Branch versions will look like 1.2.3-{normalized branchname}{git rev} So for the branch fix/versioning based on mainline 2.3.4 it would look like: 2.3.4-fix_versioning12
On pushes to main

Creates a version based on the MAJOR and MINOR version from the version file in the branch being merged.

If the main branch is on the same MAJOR and MINOR version as the feature branch the PATCH version will be bumped.

If the main branch is on a higher MAJOR or MINOR version than the feature branch being merged, the PR will be merged but you will have a conflict on versions.

If the main branch is on a lower MAJOR or MINOR version than the feature branch the version from the feature branch will be used and the PATCH version will be set to .1.

Since the action will run after the actual push to any branch is already completed, the version file at the HEAD of the branch will be fowled by your commit and cannot be trusted for calculating branches, therefor for calculations the latest tagged version of the main branch is used for that.