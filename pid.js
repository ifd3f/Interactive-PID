var ctx = $("#graph");

function PID(p, i, d) {
    this.p = p;
    this.i = i;
    this.d = d;

    this.sumError = 0;
    this.lastError = 0;
}

PID.prototype.push = function(error, dt) {
    this.sumError += error * dt;
    var delta = (error - this.lastError) / dt;
    var out = this.p * error + this.i * this.sumError + this.d * delta;
    this.lastError = error
    return out;
};

function simulate(args) {
    var pid = new PID(args.pid.p, args.pid.i, args.pid.d);
    const dt = 1 / args.frequency;
    const frames = _.range(0, args.duration, dt)

    var x = 0;
    var v = 0;

    var x_ = [];
    var v_ = [];
    var f_ = [];

    for (var i = 0; i <= frames.length; i++) {
        var t = frames[i];
        const raw = pid.push(x - args.target, dt);
        const force = Math.min(Math.max(raw, -args.forceLimit), args.forceLimit);  // Constrain the force
        v += force * dt;
        x += v * dt;

        x_.push(x);
        v_.push(v);
        f_.push(force);
    }

    return {time: frames, pos: x_, vel: v_, force: f_}
}

function onSliderChange() {
    var pid = {
        p: $("#p-slider").val(),
        i: $("#i-slider").val(),
        d: $("#d-slider").val()
    };

    $("#p-value").text(pid.p);
    $("#i-value").text(pid.i);
    $("#d-value").text(pid.d);

    updateChart(pid);
}

function updateChart(pidArgs) {
    var simulationArgs = {
        pid: pidArgs,
        target: 1,
        duration: 10,
        frequency: 10
    };
    var output = simulate(simulationArgs);
}

$(function() {
    $(".pid-slider").each(function() {
        $(this)[0].oninput = onSliderChange;
    });
});