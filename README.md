# [Screeps](https://screeps.com) AI based on old CCC code  

### Getting started with the repository  

#### Prerequisites 

* On Unix/Linux Distrubutions  
  You must have SSH keys linked to your GitHub account before following these instrucitons.  See https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account for details on setting this up.  
  
* On Windows  
  If you are not familiar in using a CLI (command line interface), it is recommened that you use Github Desktop https://desktop.github.com/, it is quite simple.  
  If you don't want to use Github Desktop, you must have SSH keys linked to your GitHub account before following these instructions (at least for *Installation: 3. Clone repository and submodules*).  
  
  To use **powershell**, you may have to do the following steps: 
  * Install OpenSSH  
    https://github.com/PowerShell/Win32-OpenSSH/wiki/Install-Win32-OpenSSH 
  * Install Git  
    https://git-scm.com/download/win
  * Install posh-git  
    https://github.com/dahlbyk/posh-git/blob/master/README.md
  * Extend PATH variable
    * Press "windows key" + "pause/break"
    * Click `Advanced system settings`
    * Click `Environment Variables`
    * In the `System Variables` area, locate the `Path` variable, highlight it and click `Edit`
    * Add path variables for git and OpenSSH (depending on where you put them)
      * C:\Program Files\Git
      * C:\Program Files\Git\bin
      * C:\Program Files\Git\cmd
      * C:\Program Files\OpenSSH
      
    
  * Add SSH keys to your github account  
    https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account

  Alternatively, you can use the git bash (included in git) or git shell (included in Github Desktop) or maybe your IDE or ...

#### Installation

1. Install Node  
  https://nodejs.org/en/

2. Install the grunt CLI (using admin rights/sudo if required)  
  `npm install -g grunt-cli`  

3. Clone repository and submodules  
  * via CLI  
    `git clone --recursive git@github.com:SirLovi/Screeps.git`  

4. Install dependencies after changing directory into the newly cloned work area  
  `cd Screeps`  
  `npm i`

5. Create a screeps.json file (copy example.screeps.json) & enter screeps account login data  
  `cp example.screeps.json screeps.json`

#### Usage

1. Commands
  * to build (without deployment)  
  `grunt`  
  * to build & deploy  
  `grunt deploy [--branch=<customBranch>]`
  * to build & deploy automatically upon saving  
  `grunt watch [--branch=<customBranch>]`
  * to build & publish to a folder (define in screeps.json)  
  `grunt publish`
  
2. After your first deployment using this repository, please call `delete Memory.modules;` from within the screeps console, to update module references.  
  *required only once, or maybe upon changes regarding module loading*  

3. You may want to create a directory called `overrides`. Here you'll be able to place `custom.*` and `viral.*` files that will be merged eventually.  
Please note, that it is required to call `getPath('<originalModuleNameWithoutExtension>', true)`, when adding a new `custom.*` or `viral.*` file to bust the cache and enable it.  
[More about custom overrides](https://gitlab.com/ScreepsCCC/public/wikis/Custom-Module-Overrides)  

4. Deploy Options
  * `--branch` : Use with `grunt deploy` or `grunt watch` to deploy code to a custom screeps branch. Will deploy to branch defined in screeps.json when not specifying --branch on command.

## Links

[Repository Wiki](https://gitlab.com/ScreepsCCC/public/wikis)   
[Screeps Forum](https://screeps.com/forum/)   
[Screeps Discord](https://discord.gg/screeps)   
[Screeps GitHub](https://github.com/screeps/screeps)   
[Screeps Twitter](https://twitter.com/ScreepsGame)   
[Screeps Facebook](https://facebook.com/ScreepsGame)   
