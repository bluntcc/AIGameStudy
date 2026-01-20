
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

let vehicles = [];
let target = new Vector2D(canvas.width / 2, canvas.height / 2);
let obstacles = [];
let path = new Path();

// Setup UI
const select = document.getElementById('behaviorSelect');
let currentBehavior = 'seek';
let debug = false;

select.addEventListener('change', (e) => {
    currentBehavior = e.target.value;
    resetSimulation();
});

window.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    target.x = e.clientX - rect.left;
    target.y = e.clientY - rect.top;
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        debug = !debug;
    }
});

function resetSimulation() {
    vehicles = [];
    obstacles = [];
    path = new Path();

    // Clear targets
    target = new Vector2D(canvas.width / 2, canvas.height / 2);

    if (currentBehavior === 'seek' || currentBehavior === 'flee' || currentBehavior === 'arrive') {
        vehicles.push(new Vehicle(100, 100));
    }
    else if (currentBehavior === 'wander') {
        for (let i = 0; i < 5; i++) vehicles.push(new Vehicle(Math.random() * canvas.width, Math.random() * canvas.height));
    }
    else if (currentBehavior === 'pursuit' || currentBehavior === 'evade') {
        // Create a target vehicle (wandering)
        let t = new Vehicle(canvas.width / 2, canvas.height / 2);
        t.color = "#ff0000";
        t.updateLogic = (v) => { v.steeringManager.wander(); }; // Custom update logic
        vehicles.push(t);

        // Create pursuer/evader
        let v = new Vehicle(100, 100);
        v.color = "#00ff00";
        vehicles.push(v);
    }
    else if (currentBehavior === 'collision') {
        let v = new Vehicle(100, canvas.height / 2);
        v.updateLogic = (veh) => { veh.steeringManager.seek(target); veh.steeringManager.collisionAvoidance(obstacles); };
        vehicles.push(v);

        // Add obstacles
        for (let i = 0; i < 10; i++) {
            obstacles.push(new Obstacle(Math.random() * canvas.width * 0.8 + 100, Math.random() * canvas.height, 20 + Math.random() * 20));
        }
    }
    else if (currentBehavior === 'path') {
        // Create random path
        path.addNode(100, 100);
        path.addNode(canvas.width - 100, 100);
        path.addNode(canvas.width - 100, canvas.height - 100);
        path.addNode(100, canvas.height - 100);

        let v = new Vehicle(100, 100);
        v.updateLogic = (veh) => { veh.steeringManager.pathFollowing(path); };
        vehicles.push(v);
    }
    else if (currentBehavior === 'leader') {
        let leader = new Vehicle(canvas.width / 2, canvas.height / 2);
        leader.color = "#ff0000";
        leader.updateLogic = (v) => { v.steeringManager.seek(target); };
        vehicles.push(leader);

        for (let i = 0; i < 10; i++) {
            let v = new Vehicle(Math.random() * 100, Math.random() * 100);
            v.color = "#0000ff";
            v.maxSpeed = 3; // slower than leader
            v.updateLogic = (veh) => { veh.steeringManager.leaderFollowing(leader, vehicles); };
            vehicles.push(v);
        }
    }
    else if (currentBehavior === 'queue') {
        // Create doorway (two obstacles)
        obstacles.push(new Obstacle(canvas.width / 2 - 60, canvas.height / 2, 40));
        obstacles.push(new Obstacle(canvas.width / 2 + 60, canvas.height / 2, 40));

        target = new Vector2D(canvas.width / 2, canvas.height - 50); // Doorway target

        for (let i = 0; i < 20; i++) {
            let v = new Vehicle(Math.random() * canvas.width, 50 + Math.random() * 100);
            v.updateLogic = (veh) => {
                veh.steeringManager.seek(target);
                veh.steeringManager.collisionAvoidance(obstacles);
                veh.steeringManager.queue(vehicles);
            };
            vehicles.push(v);
        }
    }
}

function update() {
    // Universal update loop
    for (let v of vehicles) {
        if (v.updateLogic) {
            v.updateLogic(v);
        } else {
            // Default behavior map
            if (currentBehavior === 'seek') v.steeringManager.seek(target);
            if (currentBehavior === 'flee') v.steeringManager.flee(target);
            if (currentBehavior === 'arrive') v.steeringManager.seek(target, 100); // 100 radius
            if (currentBehavior === 'wander') v.steeringManager.wander();
            if (currentBehavior === 'pursuit') v.steeringManager.pursuit(vehicles[0]); // 0 is target
            if (currentBehavior === 'evade') v.steeringManager.evade(vehicles[0]); // 0 is target
        }

        v.update();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Target
    ctx.strokeStyle = "rgba(255,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(target.x - 10, target.y);
    ctx.lineTo(target.x + 10, target.y);
    ctx.moveTo(target.x, target.y - 10);
    ctx.lineTo(target.x, target.y + 10);
    ctx.stroke();

    for (let o of obstacles) o.draw(ctx);
    if (path) path.draw(ctx);

    for (let v of vehicles) {
        v.draw(ctx, debug);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start
resetSimulation();
loop();
