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

function simulate(args) {
    var pid = new PID(args.pid.p, args.pid.i, args.pid.d);
    const dt = 1 / args.frequency;
    const frames = _.range(0, args.duration, dt).map(function(t) {
        return Math.round(t * 100) / 100;
    });

    var x = 0;
    var v = 0;

    var x_ = [];
    var v_ = [];
    var f_ = [];
    var p_ = [];
    var t_ = [];

    for (var i = 0; i <= frames.length; i++) {
        var t = frames[i];
        const target = args.target(t);
        const raw = pid.push(target - x, dt);

        const force = Math.min(Math.max(raw, -args.forceLimit), args.forceLimit);  // Constrain the force
        v += force * dt;
        x += v * dt;

        x_.push(x);
        v_.push(v);
        f_.push(force);
        p_.push(raw);
        t_.push(target);
    }

    return {
        time: frames, 
        pos: x_, 
        vel: v_, 
        force: f_, 
        pid: p_, 
        target: t_
    };
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

function copyInto(from, to) {
    for (var i = from.length - 1; i >= 0; i--) {
        to[i] = from[i];
    }
}

function updateChart(pidArgs) {
    var simulationArgs = {
        pid: pidArgs,
        target: function(t) {
            return 1
        },
        duration: 20,
        frequency: 10,
        forceLimit: 10
    };
    var output = simulate(simulationArgs);

    copyInto(output.pos, dsPos);
    copyInto(output.vel, dsVel);
    copyInto(output.target, dsTarget);
    copyInto(output.force, dsForce);
    copyInto(output.pid, dsOutput);

    graphPos.update();
    graphVel.update();
    graphForce.update();
}

const DURATION = 20;
const FREQUENCY = 10;

var ctxPos, ctxVel, ctxForce, graphPos, graphVel, graphForce;

var dsPos, dsTarget, dsVel, dsForce, dsOutput;

$(function() {
    $(".pid-slider").each(function() {
        $(this)[0].oninput = onSliderChange;
    });
    $(".pid-graph").each(function() {
        $(this)[0].height = 75;
    })

    var frames = _.range(0, DURATION, 1 / FREQUENCY).map(function(t) {
        return Math.round(t * 100) / 100;
    });
    dsPos = frames.slice();
    dsTarget = frames.slice();
    dsVel = frames.slice();
    dsForce = frames.slice();
    dsOutput = frames.slice();

    ctxPos = $("#graphPos");
    graphPos = new Chart(ctxPos, {
        type: "line",
        cubicInterpolationMode: "monotone",
        data: {
            labels: frames,
            datasets: [
                {
                    label: "Position",
                    //backgroundColor: "rgb(255,0,0)",
                    borderColor: "rgb(255,0,0)",
                    fill: false,
                    data: dsPos
                },
                {
                    label: "Target",
                    //backgroundColor: "rgb(0,0,255)",
                    borderColor: "rgb(0,0,255)",
                    fill: false,
                    data: dsTarget
                },
            ]
        },
        options: {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: true,
                text: "PID Position Outputs"
            },
            scales: {
                yAxes: [{
                    type: "linear",
                    display: true,
                    position: "left"
                }]
            }
        }
    });
    
    ctxVel = $("#graphVel");
    graphVel = new Chart(ctxVel, {
        type: "line",
        cubicInterpolationMode: "monotone",
        frames: frames,
        data: {
            labels: frames,
            datasets: [{
                label: "Velocity",
                fill: false,
                data: dsVel
            }]
        },
        options: {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: true,
                text: "PID Outputs"
            },
            scales: {
                yAxes: [{
                    type: "linear",
                    display: true,
                    position: "left"
                }]
            }
        }
    });

    ctxForce = $("#graphForce");
    graphForce = new Chart(ctxForce, {
        type: "line",
        cubicInterpolationMode: "monotone",
        data: {
            labels: frames,
            datasets: [
                {
                    label: "Raw PID",
                    fill: false,
                    data: dsOutput
                },
                {
                    label: "Constrained Force",
                    fill: false,
                    data: dsForce
                }
            ]
        },
        options: {
            responsive: true,
            hoverMode: "index",
            stacked: false,
            title: {
                display: true,
                text: "PID Outputs"
            },
            scales: {
                yAxes: [{
                    type: "linear",
                    display: true,
                    position: "left"
                }]
            }
        }
    }); 
    onSliderChange();
});