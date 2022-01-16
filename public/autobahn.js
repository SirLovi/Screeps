'use strict';

function objectLabel(gameObject) {
	if (typeof gameObject !== 'object') {
		return 'error';
	}

	let pos = gameObject;
	if (!(gameObject instanceof RoomPosition)) {
		pos = _.get(gameObject, 'pos');
	}

	if (!(pos instanceof RoomPosition)) {
		return 'error';
	}

	return `${pos.x},${pos.y},${pos.roomName}`;
}

function createLabel(x, y, roomName) {
	return `${x},${y},${roomName}`;
}

function createPos(x, y, roomName) {
	switch (typeof x) {
		case 'object':
			return {x: x.x, y: x.y, roomName: x.roomName};
		case 'string':
			return {x: parseInt(x), y: parseInt(y), roomName: roomName};
		default:
			return {x: x, y: y, roomName: roomName};
	}
}

function getLabel(pos) {
	return `${pos.x},${pos.y},${pos.roomName}`;
}

function getPos(label) {
	return createPos(...label.split(','));
}

function isRoomAllowed(roomName, roomFilter) {
	if (!roomName) {
		return false;
	}

	switch (typeof roomFilter) {
		case 'function':
			return roomFilter(roomName);
		case 'object':
			return _.includes(roomFilter, roomName);
		case 'string':
			return roomFilter === roomName;
		default:
			return false;
	}
}

function smartCreateLabel(x, y, origRoomName, roomFilter) {
	let dir = 'none';

	if (x < 0) {
		x = 48;
		dir = '7';
	}
	else if (x > 49) {
		x = 1;
		dir = '3';
	}
	else if (y < 0) {
		y = 48;
		dir = '1';
	}
	else if (y > 49) {
		y = 1;
		dir = '5';
	}

	let roomName = dir === 'none' ? origRoomName : _.get(Game.map.describeExits(origRoomName), dir);

	if (isRoomAllowed(roomName, roomFilter)) {
		return createLabel(x, y, roomName);
	}

	return null;
}

function stepGraph(fromLabel, graphs) {
	let distance = graphs.distGraph[fromLabel];
	let stepGraph = [];
	stepGraph[distance] = [fromLabel];
	for (let i = distance - 1; i >= 0; i--) {
		let nextSteps = _.map(stepGraph[i+1], label => graphs.parentGraph[label]);
		stepGraph[i] = _.union(...nextSteps);
	}

	return stepGraph;
}

function findIntersections(labels, graphs) {
	let distances = _.map(labels, label => graphs.distGraph[label]);
	let stepGraphs = _.map(labels, label => graphs.getStepGraph(label));

	let dist = _.min(distances);
	let intersections = [];

	while (intersections.length === 0) {
		let labelSets = _.map(stepGraphs, graph => graph[dist]);
		intersections = _.intersection(...labelSets);
		dist--;
	}

	return intersections;
}

function crawlNeighbors(label, graph, destinations, roomFilter) {
	let result = {destsFound: [], newLabels: [], validSteps: []};
	let pos = getPos(label);
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			let x = pos.x + dx;
			let y = pos.y + dy;
			let newLabel = smartCreateLabel(x, y, pos.roomName, roomFilter);

			if (!newLabel) {
				continue;
			}

			if (destinations.has(newLabel)) {
				result.destsFound.push(newLabel);
			}

			let dist = graph[newLabel];
			if (dist === undefined) {
				result.newLabels.push(newLabel);
			} else if (dist > graph[label]) {
				result.validSteps.push(newLabel);
			}
		}
	}

	return result;
}

function attachGetters(object) {
	let getStepGraph = (fromLabel) => stepGraph(fromLabel, object);
	object.getStepGraph = _.memoize(getStepGraph);
	let getIntersections = (labels) => findIntersections(labels, object);
	object.getIntersections = _.memoize(getIntersections);

	return object;
}

function isBlocking(structure) {
	return (
		structure.structureType !== STRUCTURE_ROAD
		&& structure.structureType !== STRUCTURE_CONTAINER
		&& !(structure.structureType === STRUCTURE_RAMPART && structure.my)
	);
}

function isWalkable(label) {
	let pos = getPos(label);
	let room = Game.rooms[pos.roomName];
	let walkable = Game.map.getRoomTerrain(pos.roomName).get(pos.x, pos.y) !== TERRAIN_MASK_WALL;

	if (walkable && room) {
		let structs = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
		walkable = (_.find(structs, isBlocking) === undefined);
	}

	return walkable;
}

/**
 * Builds a directed acyclic graph around the start to the destinations.
 * @param start {string}: The start position label of the network.
 * @param destinations {string[]}: Destination position labels.
 * @param options {object}: Not yet implemented.
 * @returns {Object} An object containing parentGraph and distGraph
 */
function buildGraphs(start, destinations, options) {
	let parentGraph = Object.create(null);
	parentGraph[start] = [];
	let distGraph = Object.create(null);
	distGraph[start] = 0;
	let queue = [];
	let nextQueue = [start];
	let distance = 0;
	let remainingDests = new Set(destinations);
	let roomFilter = _.get(options, 'roomFilter', getPos(start).roomName);

	while (remainingDests.size > 0) {
		queue = nextQueue;
		nextQueue = [];
		distance++;

		if (queue.length === 0) {
			return ERR_NO_PATH;
		}

		while (queue.length > 0) {
			let label = queue.pop();
			let results = crawlNeighbors(label, distGraph, remainingDests, roomFilter);
			_.forEach(results.newLabels, newLabel => {
				if (isWalkable(newLabel)) {
					nextQueue.push(newLabel);
				}
				distGraph[newLabel] = distance;
				parentGraph[newLabel] = [label];
			});
			_.forEach(results.validSteps, step => parentGraph[step].push(label));
			_.forEach(results.destsFound, dest => remainingDests.delete(dest));
		}
	}

	return attachGetters({parentGraph, distGraph});
}

function pairs(array) {
	let len = array.length;
	let result = [];
	for (let i = 0; i < len; i++) {
		for (let j = i + 1; j < len; j++) {
			result.push([array[i], array[j]]);
		}
	}

	return result;
}

function getJunctions(pair, graphs) {
	let intersections = graphs.getIntersections(pair);
	return _.map(intersections, label => [...pair, label]);
}

function updateDestinations(junction, destinations) {
	let cleanedDestinations = _.without(destinations, ...junction);
	return _.sortBy([...cleanedDestinations, _.last(junction)]);
}

function recursiveSearch(start, destinations, graphs, path = []) {
	if (destinations.length === 1) {
		return [[...path, [...destinations, start]]];
	}
	let destPairs = pairs(destinations);
	let junctions = _.flatten(_.map(destPairs, pair => getJunctions(pair, graphs)));

	return _.flatten(_.map(junctions, junction =>
		recursiveSearch(
			start,
			updateDestinations(junction, destinations),
			graphs,
			[...path, junction]
		)
	));
}

function junctionCost(junction, graphs) {
	// junction is an array of labels which all converge
	// on the final label in the array

	let dists = _.map(junction, label => graphs.distGraph[label]);
	// use intersection dist, plus one to exclude the cost
	// of the intersection level from each inbound segment
	let endDist = dists.pop() + 1;
	// add back the cost of the intersection itself ONCE
	return _.sum(dists, dist => dist - endDist) + 1;
}

function getBest(result, network, costFunction) {
	// network is an array of junction arrays.
	// each junction array is an array of labels which
	// all converge on the final label in the array.
	let cost = _.sum(network, costFunction);
	if (cost < result.cost) {
		result.cost = cost;
		result.networks = [network];
	} else if (cost === result.cost) {
		result.networks.push(network);
	}

	return result;
}

function bestNetworks(start, destinations, graphs) {
	let arr = _.sortBy(destinations);
	let allNetworks = recursiveSearch(start, arr, graphs);
	let curriedCost = junction => junctionCost(junction, graphs);
	let curriedBest = (result, network) => getBest(result, network, curriedCost);

	return _.reduce(allNetworks, curriedBest, {cost: Infinity, networks: []});
}

function findPath(fromLabel, toLabel, graphs) {
	let graph = graphs.getStepGraph(fromLabel);
	let dist = graphs.distGraph[toLabel];
	let max = graphs.distGraph[fromLabel];
	let label = toLabel;
	let path = [toLabel];

	while (fromLabel !== label && dist < max) {
		dist++;
		label = _.find(graph[dist], child => _.includes(graphs.parentGraph[child], label));
		path.push(label);
	}

	return path;
}

function materializeJunction(junction, graphs) {
	let feeders = _.initial(junction);
	let intersection = _.last(junction);

	let paths = _.map(feeders, feeder =>
		// strip final label from path because it's the intersection
		_.initial(findPath(feeder, intersection, graphs))
	);
	// add back the intersection once
	return [..._.flatten(paths), intersection];
}

function materializeNetwork(network, graphs) {
	let curriedMatJunct = junct => materializeJunction(junct, graphs);
	return _.union(..._.map(network, curriedMatJunct));
}

function roomPosition(label) {
	if (typeof label !== 'string') {
		return ERR_INVALID_ARGS;
	}

	let [x, y, roomName] = label.split(',');
	return new RoomPosition(x, y, roomName);
}

/**
 * Finds a road network connecting the start position to the destinations.
 * @param start {RoomPosition}: The start position of the network.
 * @param destinations {RoomPosition[]}: Destinations for the network to reach.
 * @param options {object}: Not yet implemented.
 * @returns {RoomPosition[]}
 */

function autobahn(start, destinations, options = {}) {
	let startLabel = objectLabel(start);
	let destLabels = _.map(destinations, objectLabel);

	if (startLabel === 'error' || _.includes(destLabels, 'error')) {
		return ERR_INVALID_ARGS;
	}

	let graphs = buildGraphs(startLabel, destLabels, options);

	if (graphs === ERR_NO_PATH) {
		return ERR_NO_PATH;
	}

	let {networks} = bestNetworks(startLabel, destLabels, graphs, options);

	if (networks.length === 0) {
		return ERR_NOT_FOUND;
	}

	let positions = materializeNetwork(_.first(networks), graphs, options);
	let output = _.map(positions, roomPosition);

	return output;
}

function printGraph(parentGraph) {
	_.forEach(parentGraph, (parents, label) =>
		_.forEach(parents, parent =>
			new RoomVisual('sim').line(getPos(label), getPos(parent))
		)
	);
}

function printLabel(label, circleOptions) {
	let pos = getPos(label);
	new RoomVisual(pos.roomName).circle(pos, circleOptions);
}

function printStepGraph(stepGraph, circleOptions) {
	_.forEach(_.flattenDeep(stepGraph), label => {
		let pos = getPos(label);
		new RoomVisual(pos.roomName).circle(pos, circleOptions);
	});
}



var index = Object.freeze({
	autobahn: autobahn,
	buildGraphs: buildGraphs,
	bestNetworks: bestNetworks,
	materializeNetwork: materializeNetwork,
	printGraph: printGraph,
	printLabel: printLabel,
	printStepGraph: printStepGraph,
	createLabel: createLabel,
	createPos: createPos,
	getLabel: getLabel,
	getPos: getPos,
	smartCreateLabel: smartCreateLabel
});

for (let item in index) {
	autobahn[item] = index[item];
}

module.exports = autobahn;
