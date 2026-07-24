// Single source of truth for the Zikir Khafi spoken guidance recording's
// location — swap the recording later by uploading a new file with this
// SAME name/path to the Supabase Storage dashboard (overwrite), no code
// change or redeploy needed.
export const GUIDANCE_AUDIO_BUCKET = 'madrasah-audio'
export const GUIDANCE_AUDIO_PATH = 'zikir-khafi/guidance.mp3'
