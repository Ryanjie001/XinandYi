ALTER TABLE `couple_settings`
  ADD COLUMN `xinLunarBirthday` VARCHAR(5) NOT NULL DEFAULT '',
  ADD COLUMN `yiLunarBirthday` VARCHAR(5) NOT NULL DEFAULT '',
  ADD COLUMN `xinLunarLeap` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `yiLunarLeap` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `xinBirthdayCalendar` VARCHAR(5) NOT NULL DEFAULT 'solar',
  ADD COLUMN `yiBirthdayCalendar` VARCHAR(5) NOT NULL DEFAULT 'solar';
