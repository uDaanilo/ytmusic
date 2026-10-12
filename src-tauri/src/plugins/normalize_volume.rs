use super::Plugin;

/// Keeps the <video> volume pinned to the player slider instead of YTM's per-track loudness
/// normalization. The work happens in `web/page/normalize_volume.ts`, which follows the
/// `plugins:enabled` / `plugins:disabled` events the manager emits, so nothing runs here.
pub struct NormalizeVolumePlugin;

impl Plugin for NormalizeVolumePlugin {
    fn name(&self) -> &'static str {
        "NormalizeVolume"
    }
}
