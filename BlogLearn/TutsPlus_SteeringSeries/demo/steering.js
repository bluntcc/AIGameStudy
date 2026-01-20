
class Vehicle {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1); // Random start velocity
        this.velocity.normalize().scale(2);
        this.mass = 20;
        this.maxSpeed = 4;
        this.maxForce = 0.5;
        this.steeringManager = new SteeringManager(this);

        this.color = "#00ff00";
        this.radius = 10;
    }

    update() {
        this.steeringManager.update();

        // Wrap around screen
        if (this.position.x > window.innerWidth) this.position.x = 0;
        if (this.position.x < 0) this.position.x = window.innerWidth;
        if (this.position.y > window.innerHeight) this.position.y = 0;
        if (this.position.y < 0) this.position.y = window.innerHeight;
    }

    draw(ctx, debug = false) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);

        // Rotate to face velocity
        const angle = Vector2D.calculateAngle(this.velocity);
        ctx.rotate(angle);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-10, 5);
        ctx.lineTo(-10, -5);
        ctx.closePath();
        ctx.fill();

        if (debug) {
            // Draw velocity
            ctx.strokeStyle = "#FFFF00"; // Yellow velocity
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(20, 0); // Simplified visual
            ctx.stroke();
        }

        ctx.restore();

        if (debug) {
            // Draw visual debug for steering
            if (this.steeringManager.wanderTarget) {
                // Draw wander circle logic if wandering
                // ... (simplified)
            }
        }
    }
}

class Obstacle {
    constructor(x, y, r) {
        this.center = new Vector2D(x, y);
        this.radius = r;
    }
    draw(ctx) {
        ctx.fillStyle = "#555";
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Path {
    constructor() {
        this.nodes = [];
        this.radius = 20;
    }

    addNode(x, y) {
        this.nodes.push(new Vector2D(x, y));
    }

    draw(ctx) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (this.nodes.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
        }
        ctx.stroke();
    }
}


class SteeringManager {
    constructor(host) {
        this.host = host;
        this.steering = new Vector2D(0, 0);

        // Wander properties
        this.wanderAngle = 0;
        this.circleDistance = 60;
        this.circleRadius = 10;
        this.angleChange = 0.5;

        // Path following
        this.path = null;
        this.currentNode = 0;
        this.pathDir = 1;
    }

    reset() {
        this.steering = new Vector2D(0, 0);
    }

    update() {
        this.steering.truncate(this.host.maxForce);
        this.steering.scale(1 / this.host.mass);

        this.host.velocity.add(this.steering);
        this.host.velocity.truncate(this.host.maxSpeed);

        this.host.position.add(this.host.velocity);

        // Reset steering for next frame
        this.reset();
        // Note: In a real ECS system we might reset at start of frame, but here works too. 
        // Actually, if we reset here, we can't accumulate multiple calls from outside if called before update.
        // But our main loop will likely be: 
        // manager.seek(); manager.flee(); manager.update();
        // So the reset should conceptually be at the start or end. 
        // Let's keep reset inside methods or rely on update clearing it? 
        // The tutorial says accumulation. 
        // "Reset the internal steering force." 
        // Let's assume reset() is called manually or by update(). 
        // We will call reset() at start of update() is wrong because we need the forces added BEFORE update.
        // So reset should be the last thing in update(). Correct.
    }

    // --- Public Behaviors ---

    seek(target, slowingRadius = 0) {
        this.steering.add(this.doSeek(target, slowingRadius));
    }

    flee(target) {
        this.steering.add(this.doFlee(target));
    }

    wander() {
        this.steering.add(this.doWander());
    }

    evade(targetBoid) {
        this.steering.add(this.doEvade(targetBoid));
    }

    pursuit(targetBoid) {
        this.steering.add(this.doPursuit(targetBoid));
    }

    collisionAvoidance(obstacles) {
        this.steering.add(this.doCollisionAvoidance(obstacles));
    }

    pathFollowing(path) {
        this.path = path; // Update internal ref
        this.steering.add(this.doPathFollowing());
    }

    leaderFollowing(leader, followers) {
        this.steering.add(this.doLeaderFollowing(leader, followers));
    }

    queue(neighbors) {
        this.steering.add(this.doQueue(neighbors));
    }

    // --- Internal Implementations ---

    doSeek(target, slowingRadius = 0) {
        let force = new Vector2D(0, 0);
        let desired = Vector2D.subtract(target, this.host.position);
        let distance = desired.length();
        desired.normalize();

        if (distance <= slowingRadius) {
            desired.scale(this.host.maxSpeed * (distance / slowingRadius));
        } else {
            desired.scale(this.host.maxSpeed);
        }

        force = Vector2D.subtract(desired, this.host.velocity);
        return force;
    }

    doFlee(target) {
        let desired = Vector2D.subtract(this.host.position, target);
        desired.normalize();
        desired.scale(this.host.maxSpeed);

        let force = Vector2D.subtract(desired, this.host.velocity);
        return force;
    }

    doWander() {
        // Calculate circle center
        let circleCenter = this.host.velocity.clone();
        circleCenter.normalize();
        circleCenter.scale(this.circleDistance);

        // Calculate displacement
        let displacement = new Vector2D(0, -1);
        displacement.scale(this.circleRadius);

        // Rotate displacement
        let len = displacement.length();
        displacement.x = Math.cos(this.wanderAngle) * len;
        displacement.y = Math.sin(this.wanderAngle) * len;

        // Change angle randomly
        this.wanderAngle += (Math.random() * this.angleChange) - (this.angleChange * 0.5);

        let wanderForce = circleCenter.add(displacement);

        // For debugging
        this.wanderTarget = Vector2D.add(this.host.position, circleCenter).add(displacement);

        return wanderForce;
    }

    doEvade(targetBoid) {
        let distance = Vector2D.subtract(targetBoid.position, this.host.position);
        let updatesAhead = distance.length() / this.host.maxSpeed;

        let futurePos = targetBoid.position.clone().add(targetBoid.velocity.clone().scale(updatesAhead));
        return this.doFlee(futurePos);
    }

    doPursuit(targetBoid) {
        let distance = Vector2D.subtract(targetBoid.position, this.host.position);
        let updatesAhead = distance.length() / this.host.maxSpeed;

        let futurePos = targetBoid.position.clone().add(targetBoid.velocity.clone().scale(updatesAhead));
        return this.doSeek(futurePos);
    }

    doCollisionAvoidance(obstacles) {
        let ahead = this.host.position.clone().add(this.host.velocity.clone().normalize().scale(this.host.maxSpeed * 20)); // MAX_SEE_AHEAD
        let ahead2 = this.host.position.clone().add(this.host.velocity.clone().normalize().scale(this.host.maxSpeed * 10));

        let mostThreatening = null;

        for (let obs of obstacles) {
            let collision = (ahead.distance(obs.center) <= obs.radius) || (ahead2.distance(obs.center) <= obs.radius); // Simplified check
            // Better check: line intersect circle? Tutorial uses the simplified one or point in circle.
            // Tutorial: return distance(obstacle.center, ahead) <= obstacle.radius || distance(obstacle.center, ahead2) <= obstacle.radius;
            // Let's stick to tutorial simple check.

            if (collision && (mostThreatening == null || this.host.position.distance(obs.center) < this.host.position.distance(mostThreatening.center))) {
                mostThreatening = obs;
            }
        }

        let avoidance = new Vector2D(0, 0);
        if (mostThreatening != null) {
            avoidance.x = ahead.x - mostThreatening.center.x;
            avoidance.y = ahead.y - mostThreatening.center.y;
            avoidance.normalize();
            avoidance.scale(this.host.maxForce * 10); // MAX_AVOID_FORCE
        }
        return avoidance;
    }

    doPathFollowing() {
        if (!this.path || this.path.nodes.length === 0) return new Vector2D(0, 0);

        let target = this.path.nodes[this.currentNode];

        if (this.host.position.distance(target) <= this.path.radius) {
            this.currentNode += this.pathDir;
            if (this.currentNode >= this.path.nodes.length || this.currentNode < 0) {
                this.pathDir *= -1;
                this.currentNode += this.pathDir;
            }
        }

        return this.doSeek(target);
    }

    doSeparation(neighbors) {
        let force = new Vector2D(0, 0);
        let neighborCount = 0;
        let separationRadius = 25; // Define locally or constant

        for (let b of neighbors) {
            if (b != this.host && b.position.distance(this.host.position) <= separationRadius) {
                force.x += b.position.x - this.host.position.x;
                force.y += b.position.y - this.host.position.y;
                neighborCount++;
            }
        }

        if (neighborCount != 0) {
            force.x /= neighborCount;
            force.y /= neighborCount;
            force.scale(-1);
            force.normalize().scale(this.host.maxForce * 2); // Multiplier for separation
        }

        return force;
    }

    doLeaderFollowing(leader, followers) {
        let tv = leader.velocity.clone().scale(-1).normalize().scale(50); // LEADER_BEHIND_DIST
        let behind = leader.position.clone().add(tv);

        let force = this.doSeek(behind, 50); // Arrive
        force.add(this.doSeparation(followers));

        // Evade leader if in front
        // Simple sight check
        let leaderAhead = leader.position.clone().add(leader.velocity.clone().normalize().scale(50));
        if (leaderAhead.distance(this.host.position) <= 20) { // SIGHT RADIUS
            force.add(this.doEvade(leader).scale(2));
        }

        return force;
    }

    doQueue(neighbors) {
        let brake = new Vector2D(0, 0);

        let maxQueueAhead = 40;
        let qa = this.host.velocity.clone().normalize().scale(maxQueueAhead);
        let ahead = this.host.position.clone().add(qa);

        let neighbor = null;
        for (let b of neighbors) {
            if (b != this.host && ahead.distance(b.position) <= 15) { // MAX_QUEUE_RADIUS
                neighbor = b;
                break;
            }
        }

        if (neighbor != null) {
            brake.x = -this.steering.x * 0.8;
            brake.y = -this.steering.y * 0.8;

            let v = this.host.velocity.clone().scale(-1);
            brake.add(v);

            brake.add(this.doSeparation(neighbors));
        }

        return brake;
    }
}
