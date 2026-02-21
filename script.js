(function () {
    "use strict";

    // --- Bresenham-style even distribution ---
    // Distributes `total` items into `groups` segments as evenly as possible,
    // spreading the larger segments across the sequence rather than clumping them.
    function bresenhamDistribute(total, groups) {
        var base = Math.floor(total / groups);
        var remainder = total % groups;
        var segments = [];
        var error = 0;
        for (var i = 0; i < groups; i++) {
            error += remainder;
            if (error >= groups) {
                segments.push(base + 1);
                error -= groups;
            } else {
                segments.push(base);
            }
        }
        return segments;
    }

    // --- Core calculation ---
    function calculate(start, target) {
        if (start === target) {
            return { type: "none" };
        }

        if (target > start) {
            return calcIncrease(start, target);
        }
        return calcDecrease(start, target);
    }

    function calcIncrease(start, target) {
        var inc = target - start;

        // Dense case: more increases than existing stitches
        if (inc >= start) {
            return calcDenseIncrease(start, target, inc);
        }

        // Normal case: distribute `start` stitches into `inc` groups
        var segments = bresenhamDistribute(start, inc);
        var parts = [];
        for (var i = 0; i < segments.length; i++) {
            parts.push("knit " + segments[i] + ", add 1");
        }
        var pattern = parts.join(", ");

        // Verification
        var knitSum = segments.reduce(function (a, b) { return a + b; }, 0);
        var verify = verifyIncrease(knitSum, inc, start, target);

        return {
            type: "increase",
            summary: "Increase " + inc + " stitches evenly (" + start + " \u2192 " + target + ")",
            pattern: pattern,
            verify: verify
        };
    }

    function calcDenseIncrease(start, target, inc) {
        // Distribute `inc` increases into `start` groups
        var segments = bresenhamDistribute(inc, start);
        var parts = [];
        for (var i = 0; i < segments.length; i++) {
            parts.push("knit 1, add " + segments[i]);
        }
        var pattern = parts.join(", ");

        var addSum = segments.reduce(function (a, b) { return a + b; }, 0);
        var verify = verifyIncrease(start, addSum, start, target);

        return {
            type: "increase",
            summary: "Increase " + inc + " stitches evenly (" + start + " \u2192 " + target + ") \u2014 dense increase",
            pattern: pattern,
            verify: verify
        };
    }

    function verifyIncrease(knitSum, addCount, start, target) {
        var ok = knitSum === start && knitSum + addCount === target;
        return {
            ok: ok,
            text: "Verification: " + knitSum + " knit + " + addCount + " added = " + (knitSum + addCount) +
                  (ok ? " \u2705" : " \u274c MISMATCH (expected " + target + ")")
        };
    }

    function calcDecrease(start, target) {
        var dec = start - target;

        // Each k2tog consumes 2 stitches, produces 1
        var regularStitches = start - 2 * dec;

        if (regularStitches < 0) {
            return {
                type: "error",
                message: "Cannot decrease from " + start + " to " + target +
                         ": would need " + dec + " decreases, but that requires at least " +
                         (2 * dec) + " stitches. Maximum decreases possible: " + Math.floor(start / 2) + "."
            };
        }

        if (regularStitches === 0) {
            // Every pair is a k2tog
            var pattern = Array(dec).fill("k2tog").join(", ");
            var verify = verifyDecrease(0, dec, start, target);
            return {
                type: "decrease",
                summary: "Decrease " + dec + " stitches (" + start + " \u2192 " + target + ") \u2014 all k2tog",
                pattern: pattern,
                verify: verify
            };
        }

        var segments = bresenhamDistribute(regularStitches, dec);
        var parts = [];
        for (var i = 0; i < segments.length; i++) {
            parts.push("knit " + segments[i] + ", k2tog");
        }
        var patternText = parts.join(", ");

        var knitSum = segments.reduce(function (a, b) { return a + b; }, 0);
        var verifyResult = verifyDecrease(knitSum, dec, start, target);

        return {
            type: "decrease",
            summary: "Decrease " + dec + " stitches evenly (" + start + " \u2192 " + target + ")",
            pattern: patternText,
            verify: verifyResult
        };
    }

    function verifyDecrease(knitSum, decCount, start, target) {
        var consumed = knitSum + 2 * decCount;
        var produced = knitSum + decCount;
        var ok = consumed === start && produced === target;
        return {
            ok: ok,
            text: "Verification: " + knitSum + " knit + " + (2 * decCount) + " consumed by k2tog = " + consumed +
                  " stitches used, producing " + produced +
                  (ok ? " \u2705" : " \u274c MISMATCH (expected " + start + " consumed, " + target + " produced)")
        };
    }

    // --- Input validation ---
    function validate(startStr, targetStr) {
        var start = Number(startStr);
        var target = Number(targetStr);

        if (startStr === "" || targetStr === "") {
            return { ok: false, message: "Please enter both values." };
        }
        if (!Number.isInteger(start) || !Number.isInteger(target)) {
            return { ok: false, message: "Please enter whole numbers only." };
        }
        if (start <= 0 || target <= 0) {
            return { ok: false, message: "Stitch counts must be positive integers." };
        }
        return { ok: true, start: start, target: target };
    }

    // --- DOM wiring ---
    var form = document.getElementById("calc-form");
    var resultEl = document.getElementById("result");
    var summaryEl = document.getElementById("result-summary");
    var patternEl = document.getElementById("result-pattern");
    var verifyEl = document.getElementById("result-verify");
    var errorEl = document.getElementById("error");
    var copyBtn = document.getElementById("copy-btn");

    function showResult(r) {
        errorEl.classList.add("hidden");
        resultEl.classList.remove("hidden");
        summaryEl.textContent = r.summary;
        patternEl.textContent = r.pattern;
        verifyEl.textContent = r.verify.text;
        verifyEl.className = "result-verify " + (r.verify.ok ? "ok" : "fail");
    }

    function showNone() {
        errorEl.classList.add("hidden");
        resultEl.classList.remove("hidden");
        summaryEl.textContent = "No changes needed";
        patternEl.textContent = "Current and target stitch counts are equal.";
        verifyEl.textContent = "";
        copyBtn.classList.add("hidden");
    }

    function showError(msg) {
        resultEl.classList.add("hidden");
        errorEl.classList.remove("hidden");
        errorEl.textContent = msg;
    }

    function hideAll() {
        resultEl.classList.add("hidden");
        errorEl.classList.add("hidden");
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAll();

        var startStr = document.getElementById("current-stitches").value.trim();
        var targetStr = document.getElementById("target-stitches").value.trim();
        var v = validate(startStr, targetStr);

        if (!v.ok) {
            showError(v.message);
            return;
        }

        var r = calculate(v.start, v.target);

        if (r.type === "error") {
            showError(r.message);
            return;
        }

        if (r.type === "none") {
            showNone();
            return;
        }

        copyBtn.classList.remove("hidden");
        showResult(r);
    });

    // --- Copy to clipboard ---
    copyBtn.addEventListener("click", function () {
        var text = patternEl.textContent;
        navigator.clipboard.writeText(text).then(function () {
            var original = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(function () {
                copyBtn.textContent = original;
            }, 1500);
        });
    });
})();
