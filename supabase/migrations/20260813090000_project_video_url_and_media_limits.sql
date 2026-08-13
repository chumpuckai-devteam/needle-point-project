-- Project video posts + Instagram-style storage limits for uploads.

alter table public.projects
  add column if not exists video_url text not null default '';

comment on column public.projects.video_url is
  'Public Storage URL for uploaded project video (empty when image/text only).';

-- Raise project media bucket: photos still validated client-side at 8MB; videos up to 100MB.
update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v'
  ]
where id = 'project-images';

-- Ensure bucket exists for fresh envs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
