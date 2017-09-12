// class that contains animatable elements
var canvas = class Canvas {
    constructor() {
        this.elements = [];
        this.animation = null;
        this.animationTime = 0;
        this.animating = false;
    }
    // update each element
    draw() {
        for (let element of this.elements) element.draw(this.animationTime);
    }
    // add element to canvas
    add_element(element) {
        this.elements.push(element);
    }
    // remove element from canvas
    remove_element(element) {
        ArrayRemove(this.elements, element);
    }
    // start animations attached to this canvas
    animate_start() {
        this.animating = true;
        this._animate();
    }
    // animate single frame
    animate_frame() {
        this.animating = false;
        this._animate();
    }
    // animation base function
    _animate() {
        this.animation = requestAnimationFrame(function frame(time) {
            this.animationTime = time;
            this.draw();
            if (this.animating) requestAnimationFrame(frame);
        });
    }
    // stop animation after next queued frame
    animate_stop() {
        this.animating = false;
    }
    // cancel next queued frame and stop
    animate_cancel() {
        if (this.animation !== null) cancelAnimationFrame(this.animation);
    }
};

class Element {
    constructor(id) {
        this.element = typeof id === 'undefined' ? null : document.getElementById(id);
        this.motions = [];
    }

    draw(animationTime) {
        for (let motion of this.motions) if (!motion.move(animationTime)) this.remove(motion);
    }

    add_motion(motion) {
        this.motions.push(motion);
    }

    remove_motion(motion) {
        ArrayRemove(this.motions, motion);
    }
}

class Motion {
    constructor(args) {
        this.reset(args);
        this.duration = ArgOrDefault(args.duration, 1000);
        this.timing = FuncOrDefault(args.timing, Timing.linear());
        this.transform = FuncOrDefault(args.transform, Transform.none());       
        this.onStart = FuncOrDefault(args.onStart, function () { });
        this.onRepeat = FuncOrDefault(args.onEnd, function () { });
        this.onFinish = FuncOrDefault(args.onDone, function () { });
        this.onDraw = FuncOrDefault(args.onDraw, function () { });
    }

    reset(args) {
        this.start = ArgOrDefault(args.start, performance.now());
        this.repeat = ArgOrDefault(args.repeat, 0);
        this.progress = 0;
        this.end = start + duration;
        this.paused = false;
        this.started = false;
    }

    move(animationTime) {
        if (animationTime < this.start || paused) return true;
        if (animationTime >= this.end) {
            if (this.repeat === 0) {
                this.onFinish();
                return false;
            }
            else {
                if (this.repeat > 0) this.repeat--;
                this.start = performance.now();
                this.end = this.start + this.duration;
                this.onRepeat();
            }
        }
        if (!this.started) {            
            this.started = true;
            this.onStart();
        }
        this.onDraw();
        this.progress = Normalize((animationTime - this.start) / this.duration);
        this.transform.step(this.timing(this.progress));
    }
}

class Timing {
    // ----- Timing Functions -----
    // progress = time
    static linear() {
        return function (progress) {
            return progress;
        };
    }
    // progress increases exponentially
    static pow(n) {
        return function (progress) {
            return Math.pow(progress, n);
        };
    }
    // progress moves along circular arc
    static arc() {
        return function (progress) {
            return 1 - Math.sin(Math.acos(progress));
        };
    }
    // progress bounces back a couple times before finishing
    static bounce() {
        return function (progress) {
            for (let a = 0, b = 1, result; ; a += b, b /= 2) {
                if (progress >= (7 - 4 * a) / 11) {
                    return -Math.pow((11 - 6 * a - 11 * progress) / 4, 2) + Math.pow(b, 2);
                }
            }
        };
    }
    // progress as solution to polynomial
    static poly(/*coefficients*/) {
        let args = Array.from(arguments);
        return function (progress) {
            let result = 0;
            for (let i = args.length - 1, n = 0; i >= 0; i--) result += args[i] * Math.pow(progress, n++);
            return result;
        };
    }
    // linear with smoothed start and end
    static smooth() {
        return function (progress) {
            return (1 - Math.cos(progress * Math.PI)) / 2;
        };
    }
    // linear with smoothed start
    static smoothStart() {
        return function (progress) {
            return 1 - Math.cos(progress * Math.PI / 2);
        };
    }
    // linear loop with smoothed transitions
    static smoothLoop() {
        return function (progress) {
            return (1 - Math.cos(progress * 2 * Math.PI)) / 2;
        };
    }
    // ----- Modifiers -----
    // accepts a timing function, returns the EaseOut variant
    static easeOut(timing) {
        return function (progress) {
            return 1 - timing(1 - progress);
        };
    }
    // accepts a timing function, returns the EaseInOut variant
    static easeInOut(timing) {
        return function (progress) {
            if (progress < .5) return timing(2 * progress) / 2;
            else return (2 - timing(2 * (1 - progress))) / 2;
        };
    }
    // accepts a timing function, returns the Reverse variant
    static reverse(timing) {
        return function (progress) {
            return timing(1 - progress);
        };
    }
    // accepts a timing function, returns the forwardReverse variant
    static forwardReverse(timing) {
        return function (progress) {
            if (progress < 0.5) return timing(2 * progress);
            else return timing(2 - 2 * progress);
        };
    }
}

class Transform {
    static none() {
        return {
            "step": function (progress) { }
        };
    }
    static position_linear(args) {
        return {
            "start": args.start,
            "end": args.end,
            "current": args.current,
            "step": function (progress) {
                 this.current.lerp(this.start, this.end, progress);
            }
        };
    }
}

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(vector) {
        return new Vector2(this.x + vector.x, this.y + vector.y);
    }
    subtract(vector) {
        return new Vector2(this.x - vector.x, this.y - vector.y);
    }
    multiply(scalar) {       
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }
    set(vector) {
        this.x = vector.x;
        this.y = vector.y;
    }
    log() {
        console.log("Vector2: ( " + this.x + " , " + this.y + " )");
    }
    magnitude() {
        return Math.hypot(this.x, this.y);
    }
    distance(vector) {
        return Math.hypot(vector.x - this.x, vector.y - this.y);
    }
    lerp(start, end, progress) {
        this.x = Lerp(start.x, end.x, progress);
        this.y = Lerp(start.y, end.y, progress);
    }
}

function Lerp(start, end, progress) {
    return start + progress * (end - start);
}

function Normalize(num) {
    if (num < 0) return 0;
    else if (num > 1) return 1;
    else return num;
}

function ArrayRemove(array, element) {
    let index = array.indexOf(element);
    if (index > -1) array.splice(index, 1);
}

function ArgOrDefault(arg, def) {
    return typeof arg === 'undefined' ? def : arg;
}

function FuncOrDefault(func, def) {
    return typeof arg === 'function' ? func : def;
}
