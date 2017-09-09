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
        for (let motion of this.motions) if (!motion.move(animationTime, this.element)) this.remove(motion);
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
        this.start = ArgOrDefault(args.start, performance.now());
        this.duration = ArgOrDefault(args.duration, 1000);
        this.repeat = ArgOrDefault(args.repeat, 0);
        this.progress = 0;
        this.end = start + duration;
        this.timing = FuncOrDefault(args.timing, Timing.linear());
        this.moving = FuncOrDefault(args.moving, Moving.none());       
        this.onStart = FuncOrDefault(args.onStart, function () { });
        this.onRepeat = FuncOrDefault(args.onEnd, function () { });
        this.onFinish = FuncOrDefault(args.onDone, function () { });
        this.onDraw = FuncOrDefault(args.onDraw, function () { });
    }

    move(animationTime, element) {
        if (animationTime < this.start) return true;
        if (animationTime >= this.end) {
            if (this.repeat === 0) return false;
            else {
                if (this.repeat > 0) this.repeat--;
                this.start = performance.now();
                this.end = this.start + this.duration;
            }
        }
        this.movefunc(this.timing(this.progress));
    }

    progress() {
        return (animationTime - this.start) / this.duration;
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
}

class Moving {
    static none() {
        return function (progress, element) {
            return;
        };
    }
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
