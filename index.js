const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs/promises');
const exec = require('@actions/exec');
const { version } = require('os');

async function run() {
    try {

        if (github.context.eventName !== 'push') {
            core.setFailed("Not a push event")
        }
        const repo = github.context.repo.repo
        const owner = github.context.repo.owner

        const pathToVersionFile = core.getInput('path-to-version');
        const token = core.getInput('token');
        const octokit = github.getOctokit(token)

        const branch = github.context.ref.split("/").slice(2).join("_")

        let newVersion
        let presumptiveMainVersion
        
        const versionInBranch = await getVersionInBranch(pathToVersionFile)

        if (branch === "master" || branch === "main") {
            core.info("Working on a push to main or master")
            newVersion = await mainBranchVersion(versionInBranch, owner, repo, octokit, pathToVersionFile)
            presumptiveMainVersion = newVersion
        } else {
            newVersion = await featureBranchVersion(versionInBranch, branch)
            presumptiveMainVersion = await mainBranchVersion(versionInBranch, owner, repo, octokit, pathToVersionFile)
        }

        core.setOutput('presumptive_main_version', presumptiveMainVersion)
        core.setOutput('new_version', newVersion)
        core.setOutput('old_version', versionInBranch)

        return

    } catch (error) {
        core.setFailed(error.message);
    }

}

run();


async function getVersionInBranch(pathToVersionFile) {

    const versionFileContents = await fs.readFile(pathToVersionFile + '/__version__.py', { encoding: 'utf8' });

    const version = parseVersionFile(versionFileContents)
    core.info("Found current version in branch to be " + version)
    return version

}

function parseVersionFile(versionFileContents){
    let fullVersion = versionFileContents.split("'")[1]

    if(versionFileContents.indexOf('"') != -1){
        fullVersion = versionFileContents.split('"')[1]
    }

    const version = fullVersion.split("-")[0]
    return version
}

/**
 * It takes the current version and the branch name and returns a new version that includes the branch
 * name and the number of commits on the branch
 * @param currentVersion - The current version of the package.json file
 * @param branch - The name of the branch that the build is running on.
 * @returns The new version number
 */
async function featureBranchVersion(currentVersion, branch) {
    const revList = await gitRev()
    let branchVersion = currentVersion + "-" + branch + revList
    core.info("New branch version is " + branchVersion)
    return branchVersion
}

async function mainBranchVersion(currentBranchVersion, owner, repo, octokit, pathToVersionFile) {
    const currentMainBranchVersion = await getCurrentMainBranchVersion(owner, repo, octokit, pathToVersionFile)

    const mainVersionArray = currentMainBranchVersion.split(".")
    const branchVersionArray = currentBranchVersion.split(".")

    if (checkIfPatchBump(branchVersionArray, mainVersionArray)){
        return branchVersionArray[0]+"."+branchVersionArray[1]+"."+calculatePatchVersion(mainVersionArray[2])
    }

    return calculateMajorMinorVersion(branchVersionArray, mainVersionArray)

}

function checkIfPatchBump(branchVersionArray, mainVersionArray){
    return mainVersionArray[0,1] === branchVersionArray[0,1]
}
function calculateMajorMinorVersion(branchVersionArray, mainVersionArray){
    
    const mainMajor = mainVersionArray[0]
    const branchMajor = branchVersionArray[0]

    const mainMinor = mainVersionArray[1]
    const branchMinor = branchVersionArray[1]

    if (branchMajor > mainMajor){
        core.info("branchMajor bigger than mainMajor")
        return branchMajor+"."+branchMinor+".1"
    }
    
    if (branchMinor > mainMinor && branchMajor >= mainMajor){
        core.info("branchMinor bigger than main minor, branch major >= main major")
        return branchMajor+"."+branchMinor+".1"
    }
    core.info("Branch version Major or Minor seem to be smaller than main, pull in main before merge.")
    core.setOutput('message', "Branch version Major or Minor seem to be smaller than main, pull in main before merge.")
    
    return mainMajor+"."+mainMinor+"."+calculatePatchVersion(mainVersionArray[2])
}

function calculatePatchVersion(mainPatchVersion){
    core.info("patchversion updated")
    return Number(mainPatchVersion) + 1
}

async function getCurrentMainBranchVersion(owner, repo, octokit, pathToVersionFile){

    const path = pathToVersionFile.substring(1).split('.').join("")+"__version__.py"
    
    // Since the push we want to version is already in main, we need to fetch an already tagged
    // Version to get this to work properly.
    const tags = await octokit.request('GET /repos/{owner}/{repo}/tags', {
        owner: owner,
        repo: repo,
      })
    const latestTagSha = tags.data[0].commit.sha

    const versionFileResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: owner,
        repo: repo,
        path: path,
        ref: latestTagSha,
        mediaType: {
            format: "raw"
        }
    })

    core.info("__version__ file on main branch: "+versionFileResponse.data)
    
    return parseVersionFile(versionFileResponse.data)
}

/**
 * It returns the number of commits in the current branch.
 * @returns The number of commits in the current branch.
 */
async function gitRev() {
    let myOutput = '';
    let myError = '';

    const options = {};
    options.listeners = {
        stdout: (data) => {
            myOutput += data.toString();
        },
        stderr: (data) => {
            myError += data.toString();
        }
    };
    await exec.exec("git", ['rev-list', '--count', 'HEAD'], options)

    core.info("gitrevlist" + myOutput + myError)
    return myOutput
}

module.exports = calculateMajorMinorVersion;