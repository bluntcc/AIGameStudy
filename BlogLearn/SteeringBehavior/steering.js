/**
 * Simple 2D Vector Class
 */
class Vector2 {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
        }
        return this;
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
        return this;
    }

    limit(max) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
        return this;
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    copy() {
        return new Vector2(this.x, this.y);
    }

    static add(v1, v2) {
        return new Vector2(v1.x + v2.x, v1.y + v2.y);
    }

    static sub(v1, v2) {
        return new Vector2(v1.x - v2.x, v1.y - v2.y);
    }

    static dist(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

/**
 * Vehicle Class - The autonomous agent
 */
class Vehicle {
    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.r = 6;
        this.maxSpeed = 6;
        this.maxForce = 0.4;

        // Wander properties
        this.wanderTheta = 0;
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0); // Reset acceleration
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    /**
     * Seek: Steer towards the target
     */
    seek(target) {
        const desired = Vector2.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxSpeed);

        const steer = Vector2.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    /**
     * Flee: Steer away from the target
     */
    flee(target) {
        const desired = Vector2.sub(this.position, target); // Reverse of seek
        desired.normalize();
        desired.mult(this.maxSpeed);

        const steer = Vector2.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    /**
     * Arrive: Steer towards target, but slow down when close
     */
    arrive(target) {
        const desired = Vector2.sub(target, this.position);
        const d = desired.mag();

        // Defines the radius of the "slowing down" circle
        if (d < 100) {
            const m = (d / 100) * this.maxSpeed;
            desired.normalize();
            desired.mult(m);
        } else {
            desired.normalize();
            desired.mult(this.maxSpeed);
        }

        const steer = Vector2.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    /**
     * Wander: Steer randomly but smoothly
     */
    wander() {
        // Wander ring radius and distance
        const wanderR = 25;
        const wanderD = 80;
        const change = 0.3;

        this.wanderTheta += (Math.random() * 2 - 1) * change;

        // Calculate the center of the wander circle (relative to agent)
        const circlePos = this.velocity.copy();
        circlePos.normalize();
        circlePos.mult(wanderD);
        circlePos.add(this.position);

        // Calculate the target on the circle
        const h = this.velocity.heading();
        const circleOffset = new Vector2(
            wanderR * Math.cos(this.wanderTheta + h),
            wanderR * Math.sin(this.wanderTheta + h)
        );

        const target = Vector2.add(circlePos, circleOffset);

        // Debugging info to draw
        this.wanderDebug = { circlePos, target, wanderR };

        return this.seek(target);
    }

    behaviors(target, behaviorType) {
        let force;
        switch (behaviorType) {
            case 'seek':
                force = this.seek(target);
                break;
            case 'flee':
                force = this.flee(target);
                break;
            case 'arrive':
                force = this.arrive(target);
                break;
            case 'wander':
                force = this.wander();
                break;
            default:
                force = new Vector2(0, 0);
        }
        this.applyForce(force);
    }

    draw(ctx, showDebug) {
        // Draw a triangle rotated in the direction of velocity
        const theta = this.velocity.heading() + Math.PI / 2;

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(theta);

        ctx.beginPath();
        ctx.moveTo(0, -this.r * 2);
        ctx.lineTo(-this.r, this.r * 2);
        ctx.lineTo(this.r, this.r * 2);
        ctx.closePath();

        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Debug Drawing
        if (showDebug && this.wanderDebug) {
            const { circlePos, target, wanderR } = this.wanderDebug;

            // Draw circle
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.arc(circlePos.x, circlePos.y, wanderR, 0, Math.PI * 2);
            ctx.stroke();

            // Draw target on circle
            ctx.beginPath();
            ctx.fillStyle = 'red';
            ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw line to target
            ctx.beginPath();
            ctx.strokeStyle = 'white';
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
        }
    }
}

/**
 * Main Demo Manager
 */
class SteeringDemo {
    constructor(canvas) {
        this.canvas = canvas;
        this.vehicles = [];
        this.target = new Vector2(canvas.width / 2, canvas.height / 2);
        this.currentBehavior = 'seek';
        this.showDebug = false;

        // Create a single vehicle for demonstration
        this.vehicles.push(new Vehicle(canvas.width / 2, canvas.height / 2));

        // Track mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.target.x = e.clientX - rect.left;
            this.target.y = e.clientY - rect.top;
        });

        // Add vehicles on click
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.vehicles.push(new Vehicle(e.clientX - rect.left, e.clientY - rect.top));
        });
    }

    setBehavior(behavior) {
        this.currentBehavior = behavior;
    }

    setDebug(isDebug) {
        this.showDebug = isDebug;
    }

    update() {
        for (let vehicle of this.vehicles) {
            vehicle.behaviors(this.target, this.currentBehavior);
            vehicle.update();
            this.edges(vehicle);
        }
    }

    draw(ctx) {
        // Draw Target (Mouse)
        if (this.currentBehavior !== 'wander') {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.arc(this.target.x, this.target.y, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(77, 166, 255, 0.5)';
            ctx.arc(this.target.x, this.target.y, 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let vehicle of this.vehicles) {
            vehicle.draw(ctx, this.showDebug && this.currentBehavior === 'wander');
        }
    }

    edges(vehicle) {
        if (vehicle.position.x > this.canvas.width) vehicle.position.x = 0;
        else if (vehicle.position.x < 0) vehicle.position.x = this.canvas.width;

        if (vehicle.position.y > this.canvas.height) vehicle.position.y = 0;
        else if (vehicle.position.y < 0) vehicle.position.y = this.canvas.height;
    }
}
