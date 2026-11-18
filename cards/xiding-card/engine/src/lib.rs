//! Snapping engine for the Xiding business-card editor.
//!
//! While an element is dragged, its left edge, centre and right edge are compared with every
//! vertical target line (card edges, margins, centre lines, other elements' edges and centres),
//! and its top, middle and bottom with every horizontal one. The nearest match within the
//! threshold wins on each axis; ties go to the earlier candidate, then the earlier target, so the
//! TypeScript fallback in `src/snap.ts` can reproduce every answer exactly.
//!
//! The WebAssembly interface needs no allocator and no bindings: the page writes the moving box
//! and the targets into `INPUT`, calls `snap`, and reads the answer from `OUTPUT`.

/// One axis of a snap: how far to move, which line it met, and which edge met it (0 start, 1 centre, 2 end).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AxisSnap {
    pub delta: f64,
    pub guide: f64,
    pub candidate: u32,
}

/// The nearest of `candidates` to any of `targets`, within `threshold`.
pub fn snap_axis(candidates: [f64; 3], targets: &[f64], threshold: f64) -> Option<AxisSnap> {
    let mut best: Option<AxisSnap> = None;
    for (ci, c) in candidates.iter().enumerate() {
        for t in targets {
            let d = t - c;
            if d.abs() > threshold {
                continue;
            }
            let better = match best {
                None => true,
                Some(b) => d.abs() < b.delta.abs(),
            };
            if better {
                best = Some(AxisSnap { delta: d, guide: *t, candidate: ci as u32 });
            }
        }
    }
    best
}

/// Snap a box given as (left, top, right, bottom) against vertical targets `xs` and horizontal targets `ys`.
pub fn snap_box(b: [f64; 4], xs: &[f64], ys: &[f64], threshold: f64) -> (Option<AxisSnap>, Option<AxisSnap>) {
    let [l, t, r, bo] = b;
    (
        snap_axis([l, (l + r) / 2.0, r], xs, threshold),
        snap_axis([t, (t + bo) / 2.0, bo], ys, threshold),
    )
}

const INPUT_LEN: usize = 4096;
static mut INPUT: [f64; INPUT_LEN] = [0.0; INPUT_LEN];
static mut OUTPUT: [f64; 6] = [0.0; 6];

/// Where the page writes: [left, top, right, bottom, x targets…, y targets…].
#[no_mangle]
pub extern "C" fn input_ptr() -> *mut f64 {
    core::ptr::addr_of_mut!(INPUT) as *mut f64
}

/// Where the page reads: [dx, dy, guide x, guide y, x candidate, y candidate].
#[no_mangle]
pub extern "C" fn output_ptr() -> *const f64 {
    core::ptr::addr_of!(OUTPUT) as *const f64
}

/// How many f64 values the input buffer holds.
#[no_mangle]
pub extern "C" fn input_capacity() -> u32 {
    INPUT_LEN as u32
}

/// Run one snap. Returns a bit mask: 1 when x snapped, 2 when y snapped (0 when the input does not fit).
#[no_mangle]
pub extern "C" fn snap(nx: u32, ny: u32, threshold: f64) -> u32 {
    let (nx, ny) = (nx as usize, ny as usize);
    if 4 + nx + ny > INPUT_LEN {
        return 0;
    }
    // SAFETY: wasm is single-threaded here, and the page only touches these buffers between calls.
    let input = unsafe { &*core::ptr::addr_of!(INPUT) };
    let out = unsafe { &mut *core::ptr::addr_of_mut!(OUTPUT) };
    let b = [input[0], input[1], input[2], input[3]];
    let (sx, sy) = snap_box(b, &input[4..4 + nx], &input[4 + nx..4 + nx + ny], threshold);
    let mut mask = 0;
    *out = [0.0, 0.0, f64::NAN, f64::NAN, -1.0, -1.0];
    if let Some(s) = sx {
        out[0] = s.delta;
        out[2] = s.guide;
        out[4] = s.candidate as f64;
        mask |= 1;
    }
    if let Some(s) = sy {
        out[1] = s.delta;
        out[3] = s.guide;
        out[5] = s.candidate as f64;
        mask |= 2;
    }
    mask
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snaps_left_edge_to_margin() {
        let (x, y) = snap_box([6.4, 20.0, 30.0, 30.0], &[6.0, 45.0, 84.0], &[], 0.8);
        assert_eq!(x, Some(AxisSnap { delta: 6.0 - 6.4, guide: 6.0, candidate: 0 }));
        assert_eq!(y, None);
    }

    #[test]
    fn snaps_centre_to_card_centre() {
        // a 20 mm box whose centre sits at 44.7 meets the 45 mm centre line
        let (x, _) = snap_box([34.7, 0.0, 54.7, 10.0], &[45.0], &[], 0.8);
        let x = x.expect("centre snaps");
        assert_eq!(x.candidate, 1);
        assert!((x.delta - 0.3).abs() < 1e-9);
    }

    #[test]
    fn nearest_wins_and_ties_go_to_the_earlier_candidate() {
        let (x, _) = snap_box([10.0, 0.0, 20.0, 0.0], &[10.5, 20.2], &[], 0.8);
        assert_eq!(x.map(|s| s.guide), Some(20.2));
        let (x, _) = snap_box([10.0, 0.0, 20.0, 0.0], &[10.5, 20.5], &[], 0.8);
        assert_eq!(x.map(|s| s.candidate), Some(0));
    }

    #[test]
    fn nothing_beyond_the_threshold() {
        let (x, y) = snap_box([10.0, 10.0, 20.0, 20.0], &[12.0], &[25.0], 0.8);
        assert_eq!((x, y), (None, None));
    }

    #[test]
    fn the_wasm_entry_reads_and_writes_its_buffers() {
        unsafe {
            let p = input_ptr();
            let vals = [6.3, 40.0, 20.0, 48.4, 6.0, 48.0];
            for (i, v) in vals.iter().enumerate() {
                *p.add(i) = *v;
            }
        }
        assert_eq!(snap(1, 1, 0.8), 3);
        let out = unsafe { core::slice::from_raw_parts(output_ptr(), 6) };
        assert!((out[0] + 0.3).abs() < 1e-9 && out[2] == 6.0 && out[4] == 0.0);
        assert!((out[1] + 0.4).abs() < 1e-9 && out[3] == 48.0 && out[5] == 2.0);
    }
}
