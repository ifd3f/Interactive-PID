const LABEL_COLOR = "rgb(255,255,255)";
const GRID_COLOR = "rgb(128,128,128)";
const EPSILON = 0.00000001;
const SCALE_SETTINGS = {
    xAxes: [{
        display: true,
        ticks: {
            maxTicksLimit: 50,
            fontColor: LABEL_COLOR
        },
        gridLines: {
            color: GRID_COLOR
        },
    }],
    yAxes: [{
        type: "linear",
        display: true,
        position: "left",
        gridLines: {
            color: GRID_COLOR
        },
        ticks: {
            fontColor: LABEL_COLOR
        }
    }]
};

var DURATION, FREQUENCY, SAMPLING, MAX_FORCE, mass;

var target = "1";

var ctxPos, ctxVel, ctxForce, graphPos, graphVel, graphForce;

var simulationFrames, displayFrames, dsPos, dsTarget, dsDTarget, dsVel, dsForce, dsOutput;

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
    this.lastError = error;
    return out;
};

function derivative(fun) {
    return function(x) {
        return (fun(x + EPSILON) - fun(x)) / EPSILON;
    };
}

function simulate(args) {
    var pid = new PID(args.pid.p, args.pid.i, args.pid.d);
    const dt = 1 / args.frequency;
    
    const dtarget = derivative(args.target);

    var x = 0;
    var v = 0;

    var x_ = [];
    var v_ = [];
    var d_ = [];
    var f_ = [];
    var p_ = [];
    var t_ = [];

    for (var i = 0; i <= simulationFrames.length; i++) {
        var t = simulationFrames[i];
        const target = args.target(t);
        const deriv = dtarget(t);
        const raw = pid.push(target - x, dt) + args.pid.f * deriv;

        const force = Math.min(Math.max(raw, -args.forceLimit), args.forceLimit);  // Constrain the force
        const acc = force / args.mass;
        v += force * dt;
        x += v * dt;

        if (i % SAMPLING == 0) {
            x_.push(x);
            v_.push(v);
            d_.push(deriv);
            f_.push(force);
            p_.push(raw);
            t_.push(target);
        }
    }

    return {
        time: simulationFrames, 
        pos: x_, 
        vel: v_, 
        force: f_, 
        pid: p_, 
        target: t_,
        deriv: d_
    };
}

function copyInto(from, to) {
    for (var i = from.length - 1; i >= 0; i--) {
        to[i] = from[i];
    }
}

function updateGraphOutput() {
    var startTime = new Date().getMilliseconds();
    target = $("#target-function").val();

    var pid = {
        p: $("#p-slider").val(),
        i: $("#i-slider").val(),
        d: $("#d-slider").val(),
        f: $("#f-slider").val()
    };

    $("#p-value").text(pid.p);
    $("#i-value").text(pid.i);
    $("#d-value").text(pid.d);
    $("#f-value").text(pid.f);

    
    var simulationArgs = {
        pid: pid,
        target: function(t) {
            return eval(target);
        },
        mass: mass,
        duration: DURATION,
        frequency: FREQUENCY,
        forceLimit: MAX_FORCE
    };

    var output = simulate(simulationArgs);

    copyInto(output.pos, dsPos);
    copyInto(output.vel, dsVel);
    copyInto(output.deriv, dsDTarget);
    copyInto(output.target, dsTarget);
    copyInto(output.force, dsForce);
    copyInto(output.pid, dsOutput);

    graphPos.update();
    graphVel.update();
    graphForce.update();

    var completedIn = new Date().getMilliseconds() - startTime;
    $("#completed-in").text(completedIn);

}

function initializeCharts() {

    ctxPos = $("#graphPos");
    ctxVel = $("#graphVel");
    ctxForce = $("#graphForce");

    graphPos = new Chart(ctxPos, {
        type: "line",
        cubicInterpolationMode: "monotone",
        options: {
            scales: SCALE_SETTINGS
        }
    });
    
    graphVel = new Chart(ctxVel, {
        type: "line",
        cubicInterpolationMode: "monotone",
        frames: displayFrames,
        options: {
            scales: SCALE_SETTINGS
        }
    });

    graphForce = new Chart(ctxForce, {
        type: "line",
        cubicInterpolationMode: "monotone",
        options: {
            scales: SCALE_SETTINGS
        }
    }); 
    
}

function updateSimulationParams() {

    DURATION = parseFloat($("#sim-duration").val());
    FREQUENCY = parseFloat($("#sim-freq").val());
    SAMPLING = parseFloat($("#sim-sample").val());
    MAX_FORCE = parseFloat($("#sim-force-limit").val());
    mass = parseFloat($("#sim-mass").val());

    simulationFrames = _.range(0, DURATION, 1 / FREQUENCY).map(function(t) {
        return Math.round(t * 100) / 100;
    });
    displayFrames = simulationFrames.filter(function(x, i) {
        return i % SAMPLING == 0;
    });

    dsPos = displayFrames.slice();
    dsTarget = displayFrames.slice();
    dsVel = displayFrames.slice();
    dsDTarget = displayFrames.slice();
    dsForce = displayFrames.slice();
    dsOutput = displayFrames.slice();

    ctxPos = $("#graphPos");

    graphPos.data = {
        labels: displayFrames,
        datasets: [
            {
                label: "Position",
                //backgroundColor: "rgb(255,0,0)",
                borderColor: "rgb(255,0,0)",
                fill: false,
                data: dsPos,
                pointRadius: 2
            },
            {
                label: "Target",
                //backgroundColor: "rgb(0,0,255)",
                borderColor: "rgb(0,0,255)",
                fill: false,
                data: dsTarget,
                pointRadius: 2
            },
        ]
    };
    graphVel.data = {
        labels: displayFrames,
        datasets: [
            {
                label: "Velocity",
                borderColor: "rgb(0,128,0)",
                fill: false,
                data: dsVel,
                pointRadius: 2,
            },
            {
                label: "Target Derivative",
                borderColor: "rgb(0,128,255)",
                fill: false,
                data: dsDTarget,                 
                pointRadius: 2,
            }
        ]
    };
    graphForce.data = {
        labels: displayFrames,
        datasets: [
            {
                label: "Constrained Force",
                borderColor: "rgb(255, 0, 255)",
                fill: false,
                data: dsForce,                 
                pointRadius: 2
            }
        ]
    };
    updateGraphOutput();
    
}

$(function() {
    $(".pid-slider").each(function() {
        $(this)[0].oninput = updateGraphOutput;
    });

    $("#target-function").on("keydown", function(e) {
        if (e.keyCode == 13) {
            updateGraphOutput();
        }
    });

    // Set chart defaults
    Chart.defaults.global.responsive = true;
    Chart.defaults.global.hoverMode = "index";
    Chart.defaults.global.title.display = true;
    Chart.defaults.global.title.type = "linear";
    Chart.defaults.global.title.fontColor = LABEL_COLOR;
    Chart.defaults.global.legend.labels.fontColor = LABEL_COLOR;

    initializeCharts();
    updateSimulationParams();
});