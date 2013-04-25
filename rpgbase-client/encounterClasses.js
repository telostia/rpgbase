function CmdMenu(container) {
    this.cmdList = [];
    this.selectedIndex = 0;
    this.container = container;
    this.cursorHtml = "<blink>&#x25B6;</blink>";
    this.title = null;
}
CmdMenu.prototype = {
    clear: function() {
      this.cmdList = [];
    },

    setTitle: function(title) {
      this.title = title;
    },

    addCommand: function(name, callback) {
	this.cmdList.push({name: name, execute: callback});
    },
    
    moveSelectionUp: function() {
	this.selectedIndex --;
	if (this.selectedIndex < 0) {
	    this.selectedIndex = this.cmdList.length - 1;
	}
	this.showArrowAtIndex(this.selectedIndex);
    },

    moveSelectionDown: function() {
	this.selectedIndex ++;
	if (this.selectedIndex >= this.cmdList.length) {
	    this.selectedIndex = 0;
	}
	this.showArrowAtIndex(this.selectedIndex);
    },

    chooseSelected: function() {
      var cmd = this.cmdList[this.selectedIndex];
      cmd.execute();
    },

    showArrowAtIndex: function(index) {
      var rows = this.table.find("tr");
      for (var r = 0; r < rows.length; r++) {
	var cell = $(rows[r]).find("td")[0];
	if (r == index) {
	  $(cell).html(this.cursorHtml);
	} else {
	  $(cell).empty();
	}
      }
    },

    display: function() {
      this.parentTag = $("<div></div>");
      this.parentTag.addClass("menu");
      if (this.title) {
        var titleSpan = $("<span></span>");
        titleSpan.addClass("menu");
        titleSpan.html(this.title);
        this.parentTag.append(titleSpan);
      }
      this.table = $("<table></table>");
      this.table.addClass("menu");
      this.parentTag.css("left", this.screenX);
      this.parentTag.css("top", this.screenY);
      this.parentTag.append(this.table);
      this.container.append(this.parentTag);

	var self = this;

	for (var c in this.cmdList) {
	    var row = $("<tr></tr>");
	    var cell = $("<td></td>");
	    cell.html();
	    row.append(cell);
	    cell = $("<td></td>");
	    var name = this.cmdList[c].name;
	    cell.html(name);
	    row.append(cell);
	    /*(function(row, c) {
		row.on("mouseover", function(e) {
		    self.showArrowAtIndex(c);
		});
		row.on("click", function(e) {
		    self.selectedIndex = c;
		    self.chooseSelected();
		});
	    })(row, c);*/
	    this.table.append(row);
	}
	this.showArrowAtIndex(0);
	this.parentTag.focus();
    },

  onKey: function(keyCode) {
    switch(keyCode) {
    case UP_ARROW:
      this.moveSelectionUp();
      break;
    case DOWN_ARROW:
      this.moveSelectionDown();
      break;
    case CONFIRM_BUTTON: // enter or space
      this.chooseSelected();
      break;
    }
  },

  close: function() {
    this.parentTag.remove();
  },

  reset: function() {
    this.selectedIndex = 0;
  },

  setPos: function(x, y) {
    this.screenX = x;
    this.screenY = y;
    if (this.parentTag) {
      this.parentTag.css("left", x);
      this.parentTag.css("top", y);
    }
  }
};

function Encounter(monsterList) {
  
}
Encounter.prototype = {
};

function BattleSystem(htmlElem, canvas, options) {
  this.htmlElem = htmlElem;
  this.displayElem = this.htmlElem.find(".msg-display");
  this._ctx = canvas.getContext("2d");
  this.menuStack = [];

  this.htmlElem.hide();
  this.endBattleCallbacks = [];

  if (options.defaultMsg) {
    this.defaultMsg = options.defaultMsg;
  } else {
    this.defaultMsg = "Monsters appeared!";
  }

  if (options.defaultCmdSet) {
    this.defaultCmdSet = options.defaultCmdSet;
  }
  this._drawCallback = null;
  if (options.onDrawBattle) {
    this._drawCallback = options.onDrawBattle;
  }
  this._initiativeCallback = null;
  if (options.onRollInitiative) {
    this._initiativeCallback = options.onRollInitiative;
  }

  if (options.metaCmdSet) {
    var self = this;
    function makeMetaMenu(title, cmdSet) {
      var metaMenu = new CmdMenu(self.htmlElem);
      metaMenu.setTitle(title);

      var addOneCmd = function(name, cmd) {
        // allow recursive submenus
        if (cmd.isContainer) {
          metaMenu.addCommand(name, function() {
            self.pushMenu(makeMetaMenu(name, cmd));
          });
        } else {
          metaMenu.addCommand(name, function() {
            cmd.effect(self, self.party);
          });
        }
      };
      for (var name in cmdSet.cmds) {
        addOneCmd(name, cmdSet.cmds[name]);
      }
      return metaMenu;
    }

    this.metaMenu = makeMetaMenu("Party", options.metaCmdSet);
  } else {
    this.metaMenu =null;
  }

  this.timer = null;
}
BattleSystem.prototype = {
  showMsg: function(msg) {
    this.displayElem.html(msg);
    this.displayElem.show();
  },

  pushMenu: function(newMenu) {
    console.log("pushMenu called");
    var x = 25;
    for (var i = 0; i < this.menuStack.length; i++) {
      x += 80;
    }
    newMenu.setPos(x, 250);
    this.menuStack.push(newMenu);
    newMenu.display();
  },
  
  popMenu: function() {
    if (this.menuStack.length > 1) {
      this.menuStack[ this.menuStack.length - 1].close();
      this.menuStack.pop();
    }
  },

  emptyMenuStack: function() {
    for (var i = 0; i < this.menuStack.length; i++) {
      this.menuStack[i].close();
    }
    this.menuStack = [];
  },

  choosePCCommand: function(pc, cmd, target) {
    // lock in the choice:
    pc.lockInCmd(cmd, target);

    // If that was the last party member, then hide the menus
    // and start the round!
    var pcIndex = this.party.indexOf(pc);
    if (pcIndex == this.party.length - 1) {
      this.fightOneRound();
    } else {
      // Otherwise, show menu for next party member!
      console.log("Showing menu for next party member");
      this.pushMenu(this.pcMenus[ pcIndex + 1]);
    }
  },

  makeAllyTargetMenu: function(pc, cmd) {
    var cmdMenu = new CmdMenu(this.htmlElem);
    cmdMenu.setTitle("Target?");
    var self = this;
    var addOneCmd = function(target) {
      cmdMenu.addCommand(target.name, function() {
        self.choosePCCommand(pc, cmd, target);
      });
    };
    for (var i = 0; i < this.party.length; i++) {
      addOneCmd(this.party[i]);
    }
    return cmdMenu;
  },

  randomElementFromArray: function(arr) {
    // TODO allow registering a callback to override this function
    // choose random PC:
    var index = Math.floor( Math.random() * arr.length);
    return arr[index];
  },

  chooseRandomEnemy: function(team) {
    if (team == "monster") {
      return this.randomElementFromArray(this.party);
    } else {
      return this.randomElementFromArray(this.monsters);
    }
  },

  makeMenuForPC: function(pc, cmdSet) {
    var self = this;
    var cmdMenu = new CmdMenu(this.htmlElem);
    cmdMenu.setTitle(pc.name);

    var addOneCmd = function(name, cmd) {
      // if this command has a submenu, then choosing it
      // just opens the submenu:
      if (cmd.isContainer) {
        cmdMenu.addCommand(name, function() {
          console.log("Pushing submenu for " + cmd.name);
          self.pushMenu(self.makeMenuForPC(pc, cmd));
        });
      } else {
        // but if it's a "leaf node", then next step is to pick
        // a target...
        switch (cmd.target) {
        case "random_enemy":
          // choose a random enemy to be the target:
          cmdMenu.addCommand(name, function() {
            var target = self.chooseRandomEnemy("player");
            self.choosePCCommand(pc, cmd, target);
          });
          break;
        case "ally":
          // if it targets one ally, then picking it pops open
          // the ally menu:
          cmdMenu.addCommand(name, function() {
            console.log("Pushing ally menu for " + cmd.name);
            self.pushMenu(self.makeAllyTargetMenu(pc,cmd));
          });
          break;
        default:
          // if no target needed, then choosing it
          // locks in the command for the PC.
          cmdMenu.addCommand(name, function() {
            self.choosePCCommand(pc, cmd);
          });
          break;
        }
      }
    };
    for (var name in cmdSet.cmds) {
      addOneCmd(name, cmdSet.cmds[name]);
    }
    return cmdMenu;
  },
  
  startBattle: function(player, encounter, landType) {
    this.htmlElem.show();
    this.landType = landType;
    this.player = player;
    this.party = this.player.getParty();

    this.monsters = [];
    if (encounter.number) {
      for (var i = 0; i < encounter.number; i++) {
        var monster = encounter.type.instantiate();
        // name them e.g. "Biteworm A", "Biteworm B" etc.
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        monster.setName(encounter.type.name + " " + letters[i]);
        this.monsters.push(monster);
      }
    }

    this.showMsg(this.defaultMsg);
    this.emptyMenuStack();
    this.pcMenus = [];
    for (var i = 0; i < this.party.length; i++) {
      // TODO callback to userland to let menu be customized for this PC
      this.pcMenus.push(this.makeMenuForPC(this.party[i],
                                           this.defaultCmdSet));
    }
    this.draw();
    this.showStartRoundMenu();
  },

  draw: function() {
    if (this._drawCallback) {
      this._drawCallback(this._ctx, this.monsters, this.landType);
    } else {
      this._ctx.fillStyle = "black";
      this._ctx.fillRect(0, 0, 512, 384); // TODO no hardcode

      for (var i = 0; i < this.monsters.length; i++) {
        this.monsters[i].setPos(25 + 50 * i, 25);
        this.monsters[i].plot(this._ctx);
      }
    }
  },

  onDrawBattle: function(callback) {
    this._drawCallback = callback;
  },

  onRollInitiative: function(callback) {
    this._initiativeCallback = callback;
  },

  showStartRoundMenu: function() {
    for (var i = 0; i < this.pcMenus.length; i++) {
      this.pcMenus[i].reset();
    }
    if (this.metaMenu) {
      this.metaMenu.reset();
      this.pushMenu(this.metaMenu);
    } else {
      this.showFirstPCMenu();
    }
  },

  showFirstPCMenu: function() {
    this.pushMenu(this.pcMenus[0]);
  },

  repeatLastRoundCommands: function() {
    // all that really needs doing before we start the next
    // round is to choose new targets for "random_enemy" commands.
    // (LONGTERM_TODO: or any command with a chosen target whose 
    // target is no longer valid.)
    for (var i = 0; i < this.party.length; i++) {
      var action = this.party[i].getLockedInCmd();
      if (action) {
        if (action.cmd.target == "random_enemy") {
          action.target = this.chooseRandomEnemy("player");
        }
        this.party[i].lockInCmd(action.cmd, action.target);
      }
    }
    this.fightOneRound();
  },

  defaultMonsterAI: function(monster) {
    // TODO allow overriding this with custom AI
    // for now have them all fight random players
    var fight = this.defaultCmdSet.get("FIGHT");
    // TODO this assumes there's a "fight" in the players' default
    // command set!
    var target = this.chooseRandomEnemy("monster");
    return {
      cmd: fight,
      target: target
    };
  },

  fightOneRound: function() {
    var fighters = []; // will be an ORDERED array of who goes
    var self = this;
    var fighterIndex = 0;
    var i;

    // TODO what if we had pendingCmd and pendingTarget as properties
    // of the PC and monster objects? That would make things a lot
    // easier deshou?

    // Choose actions for each monster
    for (i = 0; i < this.monsters.length; i++) {
      var name = this.monsters[i].name;
      var action = this.defaultMonsterAI(this.monsters[i]);
      this.monsters[i].lockInCmd(action.cmd, action.target);
    }

    if (this._initiativeCallback) {
      // if initiative callback is set, use it to determine
      // order of fighters.
      fighters = this._initiativeCallback(this.party,
                                          this.monsters);
    } else {
      // if not set, then everybody in party goes followed by
      // each monster:
      for (i = 0; i < this.party.length; i++) {
        fighters.push(this.party[i]);
      }
      for (i = 0; i < this.monsters.length; i++) {
        fighters.push(this.monsters[i]);
      }
    }
    
    // hide menus
    this.emptyMenuStack();

    self.showMsg("A round of battle is starting!");
    if (this.timer != null) {
      window.clearInterval(this.timer);
    }
    this.timer = window.setInterval(function() {
      if (fighterIndex == fighters.length) {
        self.showMsg("Round complete! Next round starts.");
        window.clearInterval(self.timer);
        self.timer = null;
        self.showStartRoundMenu();
        return;
      }
      var fighter = fighters[fighterIndex];
      var action = fighter.getLockedInCmd();
      if (action) {
        action.cmd.effect(self, fighter, action.target);
      } else {
        self.showMsg(fighter.name + " has no idea what to do!");
      }
      fighterIndex++;
    }, 750);
  },

  endBattle: function(winLoseRun) {
    var i;
    this.emptyMenuStack();
    this.pcMenus = [];
    switch (winLoseRun) {
    case "win":
      $("#debug").html("You won!");
      break;
    case "lose":
      $("#debug").html("You lost!");
      break;
    case "run":
      $("#debug").html("You ran away!");
      break;
    }
    if (this.timer != null) {
      window.clearInterval(this.timer);
    }
    this.htmlElem.hide();
    for (i = 0; i < this.endBattleCallbacks.length; i++) {
      this.endBattleCallbacks[i](winLoseRun);
    }
  },

  handleKey: function(keyCode) {
    if (keyCode == CANCEL_BUTTON) {
      // cancel -> pop top menu off menu stack, go back to previous one
      if (this.menuStack.length > 1) {
        this.popMenu();
      }
    } else {
      // send keystroke to menu on top of stack
      if (this.menuStack.length > 0) {
        this.menuStack[ this.menuStack.length - 1].onKey(keyCode);
      }
    }
  },

  onEndBattle: function(callback) {
    this.endBattleCallbacks.push(callback);
  }
};


function BatCmd(options) {
  if (options.canUse) {
    this.canUse = canUse;
  } else {
    this.canUse = function(user) {
      return true;
    };
  }
  this.target = options.target;
  this.effect = options.effect;
}
BatCmd.prototype = {
  isContainer: false
};


function BattleCommandSet() {
  this.cmds = {};
}
BattleCommandSet.prototype = {
  add: function(name, battleCommand) {
    battleCommand.name = name;
    this.cmds[name] = battleCommand;
    // battleCommand can be another BattleCommandSet
    // so these sets can nest recursively.
  },

  get: function(name) {
    return this.cmds[name];
  },

  isContainer: true
};

function MonsterType(img, name, statBlock) {
  this.img = img;
  this.statBlock = statBlock;
  this.name = name;
  // TODO: monster type command list
  // TODO: monster AI callback
  // TODO: need a way to set some generic functions, like, default monster
  // AI, default monster on-die handler, etc. I guess we set those on
  // the battle system?
}
MonsterType.prototype = {
  instantiate: function() {
    // return a Monster instance
    var cloneStats = {};
    for (var name in this.statBlock) {
      cloneStats[name] = this.statBlock[name];
    }
    return new Monster(this.img, cloneStats);
  }
};

function Monster(img, statBlock) {
  this.img = img;
  this.statBlock = statBlock;
  this.x = null;
  this.y = null;
  this.name = "A Monster";
};
Monster.prototype = {
  setName: function(name) {
    this.name = name;
  },
  setPos: function(x, y) {
    this.x = x;
    this.y = y;
  },
  setStat: function(statName, value) {
    this.statBlock[statName] = value;
  },
  getStat: function(statName) {
    return this.statBlock[statName];
  },
  modifyStat: function(statName, delta) {
    this.statBlock[statName] += delta;
  },
  plot: function(ctx) {
    ctx.drawImage(this.img, this.x, this.y);
  },
  lockInCmd: function(cmd, target) {
    this._lockedAction = {cmd: cmd,
                          target: target};
  },
  getLockedInCmd: function() {
    return this._lockedAction;
  }
};

/* TODO:
Part I: Monster Actions
(done) 1. name each monster
(default done) 2. have a callback for random target selection; if not provided, all enemy targets are equally likely. (define enemy target) (done)
(shared for now) 3. give monsters a default battle command set too
(done) 4. give monsters turns too
(default done) 5. AI callback that chooses which battle command a monster uses (default: it's always 'fight')
6. initiative callback to determine order of actions (default: it's random)

Part II: Game Mechanics
7. getStats and setStats
8. Message passing, registering message handlers
9. 'remove this guy from combat' function
10. write handler for "take damage" that removes guy from combat if hp drops to 0
11. have the fight command send the "take damage" message.
12. display PCs stats (at least HP) somewhere
13. trigger end battle (win or lose) when everybody on one side are wiped out
14. allow individual PC /individual monster types to override default command list with their own custom commands.
*/



/* TODO:

   monsters and players all get statblocks with 
   setStats(dictionary)
   setStat(name, value)
   getStat(name)

   create a stats display for each player character
   positioning and style of stats displays determined by css
   contents of stat display decided by userland callback

   battlesystem calls back userland to decide action order
   (here's an array of stat blocks. tell me who goes next!)

   on monster's go, call monster AI callback to let monster
   pick its action

   on PC's go, pop up a menu of that PC's commands

   one of the battlesystem options should be "batch commands" --
   if true, ask for action for all PCs at beginning of "round"
   (in which case, whoGoesNext callback should be able to say "end the
      round")(perhaps by returning null?)
   if false, each PC action is queried at the beginning of that PC's go.

   how about supporting a battle system where you put in the action but
   there's some time before it resolves (i.e. different actions have
   varying initiative penalties?)

   
   jake wants a kind of "aggro system" for monster target selection
   (that can really go in userland i think -- he just sets a stat
    called 'targetTickets' for each PC, uses that in the AI callback)


    want a 'standard command menu' which individual characters use as
    the default, but can override (especially override the magic 
      submenu).
      
    so there's probably a BattleCommandSet class which can recursively
    contain other BattleCommandSets
    and has some kind of .clone() method maybe? so you can clone it
    and then modify the clones?

    var fightCmds = new BattleCommandSet();
    fightCmds.add("CHARGE", function() {});
    fightCmds.add("STRIKE", function() {});
    // etc etc.
    var stdSet = new BattleCommandSet();
    stdSet.add("FIGHT", fightCmds);
    stdSet.add("MAGIC", null);
    // null means it's greyed out and not selectable
    
    hero.commandSet = stdSet.clone().replace("MAGIC", heroMagic);
    
    // note we want the subitems of MAGIC and the subitems of ITEM to
    be determined dynamically, at fight-start time, or better yet,
    when the menu is displayed.

    maybe each PC gets an (optional) customizeCommands callback? Now
    we're getting somewhere.

    hero.spellList = new BattleCommandSet();
    hero.spellList.add("HEAL", function() {});

    hero.onShowCommandMenu(function(pc, stdCmds) {
        stdCmds.replace("MAGIC", hero.magic);
        stdCmds.replace("ITEM", hero.items);
    });


    for implementing game mechanics like "take damage", "heal", etc
    make a message-passing API:

    something like
    
    battleSystem.onEffect("damage", function(target, effectData) {
       // the generic damage handler, which individual PCs or monster
       // types can override if they wish.
    });
    
    monsterType.onEffect("damage", function(monster, effectData) {
    });

    pc.onEffect("damage", function(monster, effectData) {
    });

    new BatCmd({
      effect: function(battle, user, target) {
        target.takeEffect("damage", {amount: 5, type: "fire"});
      }

   });

   
   Think about: how to chain multiple effect handlers together?
   Like, do we want to fall through to the default handler, or prevent
   it?

   How about: if you return an effectData, that gets passed to next
   handler in the chain. If you return nothing, the chain ends.

   This way, a fire-immune monster can be like:
   
   if (effectData.type == "fire") {
       effectData.amount = effectData.amount / 2;
   }
   return effectData;

   Battle system needs a callback for random *player* target selection
   too. If PC uses a "random_enemy" ability, how does it choose which
   one?

   Battle system doesn't need to know about hit points but it needs
   to know about how to remove a monster from the fight!

   Battle system needs "start battle" callback (mostly for animation)
*/