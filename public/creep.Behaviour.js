// base class for behaviours
const Behaviour = function(name) {
    this.name = name;
    this.actions = (creep) => []; // priority list of non resource based actions
    this.inflowActions = (creep) => []; // priority list of actions for getting resources
    this.outflowActions = (creep) => []; // priority list of actions for using resources
    this.assignAction = function(creep, action, target, debouncePriority) {
        const p = global.Util.startProfiling(creep.name + '.assignAction' + ':' + action.name || action, {enabled: global.PROFILING.BEHAVIOUR});
        if (typeof action === 'string')
            action = Creep.action[action];
        // if (action)
        //     global.logSystem(creep.room.name, `${creep.name} ACTION: ${global.json(action)}`);
        const valid = action.isValidAction(creep);
        if (global.DEBUG && global.TRACE)
            global.trace('Action', {actionName:action.name, behaviourName:this.name, creepName:creep.name, valid, Action:'isValidAction'});
        if (!valid) {
            p.checkCPU('!valid', 0.3);
            return false;
        }
        p.checkCPU('valid', 0.3);

        const addable = action.isAddableAction(creep);
        if (global.DEBUG && global.TRACE)
            global.trace('Action', {actionName:action.name, behaviourName:this.name, creepName:creep.name, addable, Action:'isAddableAction'});
        if (!addable){
            p.checkCPU('!addable', 0.3);
            return false;
        }
        p.checkCPU('addable', 0.3);

        const assigned = action.assignDebounce ? action.assignDebounce(creep, debouncePriority, target) : action.assign(creep, target);
        if (assigned) {
            if (global.DEBUG && global.TRACE)
                global.trace('Behaviour', {actionName:action.name, behaviourName:this.name, creepName:creep.name,
                assigned, Behaviour:'nextAction', Action:'assign', target: creep.target.id || creep.target.name});
            creep.data.lastAction = action.name;
            creep.data.lastTarget = creep.target.id;
            p.checkCPU('assigned', 0.3);
            return true;
        } else if (global.DEBUG && global.TRACE) {
            global.trace('Action', {actionName:action.name, behaviourName:this.name, creepName:creep.name, assigned, Behaviour:'assignAction', Action:'assign'});
        }
        p.checkCPU('!assigned', 0.3);
        return false;
    };
    this.selectInflowAction = function(creep) {
        const p = global.Util.startProfiling('selectInflowAction' + creep.name, {enabled: global.PROFILING.BEHAVIOUR});
        const actionChecked = {};
        const outflowActions = this.outflowActions(creep);
        for (const action of this.inflowActions(creep)) {
            if (!actionChecked[action.name]) {
                actionChecked[action.name] = true;
                if (this.assignAction(creep, action, undefined, outflowActions)) {
                    p.checkCPU('assigned' + action.name, 1.5);
                    // global.logSystem(creep.room.name, `${creep.name} next inflowAction assigned: ${action.name} `);
                    return true;
                }
            }
        }
        p.checkCPU('!assigned', 1.5);
        return Creep.action.idle.assign(creep);
    };
    this.selectAction = function(creep, actions, idle = true) {
        const p = global.Util.startProfiling('selectAction' + creep.name, {enabled: global.PROFILING.BEHAVIOUR});
        const actionChecked = {};
        for (const action of actions) {
            if (!actionChecked[action.name]) {
                actionChecked[action.name] = true;
                if (this.assignAction(creep, action)) {
                    p.checkCPU('assigned' + action.name, 1.5);
                    return true;
                }
            }
        }
        p.checkCPU('!assigned', 1.5);
        if (idle)
            return Creep.action.idle.assign(creep);
        else
            return false;
    };
    // this.nextOtherAction = (creep, atHome = false) => {
    //     return this.selectAction(creep, this.actions(creep, atHome), false);
    // };
    this.nextAction = function(creep) {
        return this.selectAction(creep, this.actions(creep));
    };
    this.needEnergy = function(creep) {
        return creep.sum < creep.carryCapacity / 2;
    }
    this.nextEnergyAction = function(creep) {
        if (this.needEnergy(creep)) {
            return this.selectInflowAction(creep);
        } else {
            if (creep.data.nextAction && creep.data.nextTarget) {
                const action = Creep.action[creep.data.nextAction];
                const target = Game.getObjectById(creep.data.nextTarget);
                delete creep.data.nextAction;
                delete creep.data.nextTarget;
                if (this.assignAction(creep, action, target)) {
                    return true;
                }
            }
            // if (creep.data.creepType === 'remoteHauler')
            //     global.logSystem(creep.name, `OUTFLOW ACTIONS LENGTH: ${this.outflowActions(creep).length} TYPE: ${typeof this.outflowActions(creep)} BEHAVIOUR: ${this.name}`);

            return this.selectAction(creep, this.outflowActions(creep));
        }
    };
    this.invalidAction = function(creep) {
        return !creep.action;
    };
    this.run = function(creep) {

        // if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
        //     global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} BEHAVIOUR RUN: ${creep}`);
        // }

        // Assign next Action
        if (this.invalidAction(creep)) {
            if (creep.data.destiny && creep.data.destiny.task && global.Task[creep.data.destiny.task] && global.Task[creep.data.destiny.task].nextAction) {
                global.Task[creep.data.destiny.task].nextAction(creep);
            }
            else {
                let ret;
                // ret = this.nextOtherAction(creep);
                // if (!ret)
                ret = this.nextAction(creep);
                return ret;
            }
        }

        // Do some work
        if (creep.action && creep.target) {
            if (global.DEBUG && global.TRACE)
                global.trace('Behaviour', {actionName:creep.action.name, behaviourName:this.name, creepName:creep.name, target: creep.target.id || creep.target.name, Action:'run'});
            creep.action.step(creep);
        } else {
            global.logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
            global.Task.reCycleOrIdle(creep);
        }
    };
    this.assign = function(creep) {
        creep.data.creepType = this.name;
    };
    this.strategies = {
        defaultStrategy: {
            name: `default-${this.name}`,
        }
    };
    this.selectStrategies = function(actionName) {
        return [this.strategies.defaultStrategy, this.strategies[actionName]];
    };
};
module.exports = Behaviour;
