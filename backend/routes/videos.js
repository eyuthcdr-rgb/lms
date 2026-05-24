import { Router } from 'express';
import Video from '../models/Video.js';
import User from '../models/User.js';
import { telegramAuth, requireApproved, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

function getYoutubeThumbnail(url) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
}

function getYoutubeEmbed(url) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

router.get('/', telegramAuth, requireApproved, async (req, res) => {
  const filter = req.query.subject ? { subject: req.query.subject } : {};
  const videos = await Video.find(filter).sort('-createdAt').populate('subject', 'name');
  res.json(videos);
});

router.get('/:id', telegramAuth, requireApproved, async (req, res) => {
  const video = await Video.findById(req.params.id).populate('subject', 'name icon');
  if (!video) return res.status(404).json({ error: 'Not found' });
  await User.findOneAndUpdate(
    { telegramId: req.dbUser.telegramId },
    { $addToSet: { completedVideos: video._id } }
  );
  res.json({ ...video.toObject(), embedUrl: getYoutubeEmbed(video.url) });
});

router.post('/', telegramAuth, requireAdmin, upload.single('videoFile'), async (req, res) => {
  const { subject, title, description, url, duration } = req.body;
  let type = 'youtube';
  let fileUrl = '';
  let thumbnail = '';

  if (req.file) {
    type    = 'upload';
    fileUrl = req.file.path;
    thumbnail = '';
  } else if (url) {
    thumbnail = getYoutubeThumbnail(url);
    type = url.includes('youtube') || url.includes('youtu.be') ? 'youtube' : 'link';
  }

  const video = await Video.create({
    subject, title, description,
    url: url || '',
    fileUrl, thumbnail, duration, type,
    addedBy: req.dbUser.telegramId,
  });
  res.status(201).json(video);
});

router.put('/:id', telegramAuth, requireAdmin, upload.single('videoFile'), async (req, res) => {
  const update = { ...req.body };
  if (req.file) {
    update.fileUrl = req.file.path;
    update.type    = 'upload';
  }
  if (req.body.url) {
    update.thumbnail = getYoutubeThumbnail(req.body.url);
  }
  const video = await Video.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!video) return res.status(404).json({ error: 'Not found' });
  res.json(video);
});

router.delete('/:id', telegramAuth, requireAdmin, async (req, res) => {
  await Video.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
