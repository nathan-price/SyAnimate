class animation {
	constructor(canvas, objects, active) {
		this.loaded = false;
		this.canvas = canvas;
		this.context = this.canvas.getContext('2d');
		this.objects = objects;
		for (let object of this.objects) object.setContext(this.context);
		this.active = active;
		this.checkloaded();
	}
	checkloaded() {
		for (let object of this.objects) {
			if (!object.loaded) setTimeout(checkloaded, 250);
		}
		this.loaded = true;
		if (this.active) window.requestAnimationFrame(this.step);
	}
	step(timestamp) {
		//calculate cavasSize
		for (let object of this.objects) object.render(canvasSize, timestamp);
		if (this.active) window.requestAnimationFrame(this.step);
	}
}
class animatable {
	constructor(src, position, scale) {
		this.loaded = false;
		this.position = position;
		this.scale = scale;
		this.motions = [];
		let that = this;
		this.img = new Image();
		this.img.name = src;
		this.img.onload = function() {
			that.onload();
		};
		this.img.src = src;
	}
	onload() {
		this.size = new vector2(this.img.width, this.img.height);
		this.loaded = true;
	}
	setContext(context) {
		this.context = context;
		this.dsize = new vector2(0,0);
		this.dpos = new vector2(0,0);
		this.spos = new vector2(0,0);
	}
	render(canvasSize, timestamp) {
		for (let motion of this.motions) motion.calc();
		this.dsize = this.size.times(canvasSize.times(this.scale).divide(this.size).min);
		this.dpos = canvasSize.minus(this.dsize).times(position);
		this.context.drawImage(this.img, this.spos.x, this.spos.y, this.size.x, this.size.y, this.dpos.x, this.dpos.y, this.dsize.x, this.dsize.y);
	}
}
class sprite extends animatable {
	constructor(src, numFrames, framesWide, framesHigh, position, scale) {
		super(src, position, scale);
		this.numFrames = numFrames;
		this.framesWide = framesWide;
		this.framesHigh = framesHigh;
		this.currFrame = 0;
	}
	onload() {
		this.size = new vector2(this.img.width / framesWide, this.img.height / framesHigh);
		this.loaded = true;
	}
	render(canvasSize, timestamp) {
		this.spos = new vector2(this.currFrame % this.framesWide, Math.floor(this.currFrame / this.framesWide)).times(this.size);
		super.render();
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
class vector2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	plus(other) {
		return new vector2(this.x + other.x, this.y + other.y);
	}
	minus(other) {
		return new vector2(this.x - other.x, this.y - other.y);
	}
	times(other) {
		if (other instanceof vector2) return new vector2(this.x * other.x, this.y * other.y);
		else return new vector2(this.x * other, this.y * other);
	}
	divide(other) {
		if (other instanceof vector2) return new vector2(this.x / other.x, this.y / other.y);
		else return new vector2(this.x / other, this.y / other);
	}
	set(x, y) {
		this.x = x;
		this.y = y;
	}
	get magnitude() {
		return Math.sqrt((this.x ** 2)+(this.y ** 2));
	}
	get min() {
		return Math.min(this.x, this.y);
	}
	get max() {
		return Math.max(this.x, this.y);
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
