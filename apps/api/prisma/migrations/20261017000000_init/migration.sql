-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'EDITOR',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    INDEX `AdminUser_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `userAgent` VARCHAR(255) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminSession_tokenHash_key`(`tokenHash`),
    INDEX `AdminSession_userId_idx`(`userId`),
    INDEX `AdminSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `originalName` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `publicUrl` VARCHAR(1024) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `kind` ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `checksum` VARCHAR(64) NULL,
    `altText` VARCHAR(300) NULL,
    `altTextAr` VARCHAR(300) NULL,
    `storageProvider` ENUM('LOCAL', 'S3') NOT NULL DEFAULT 'LOCAL',
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Media_storageKey_key`(`storageKey`),
    INDEX `Media_kind_idx`(`kind`),
    INDEX `Media_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `fullNameAr` VARCHAR(160) NULL,
    `displayName` VARCHAR(160) NOT NULL,
    `displayNameAr` VARCHAR(160) NULL,
    `firstName` VARCHAR(80) NOT NULL,
    `firstNameAr` VARCHAR(80) NULL,
    `initials` VARCHAR(6) NOT NULL,
    `professionalTitle` VARCHAR(160) NOT NULL,
    `professionalTitleAr` VARCHAR(160) NULL,
    `roleLine` VARCHAR(200) NULL,
    `roleLineAr` VARCHAR(200) NULL,
    `tagline` VARCHAR(255) NULL,
    `taglineAr` VARCHAR(255) NULL,
    `expertise` VARCHAR(255) NULL,
    `expertiseAr` VARCHAR(255) NULL,
    `audience` VARCHAR(255) NULL,
    `audienceAr` VARCHAR(255) NULL,
    `location` VARCHAR(160) NULL,
    `locationAr` VARCHAR(160) NULL,
    `publicEmail` VARCHAR(190) NULL,
    `publicPhone` VARCHAR(40) NULL,
    `biography` TEXT NULL,
    `biographyAr` TEXT NULL,
    `shortBiography` TEXT NULL,
    `shortBiographyAr` TEXT NULL,
    `professionalStatement` TEXT NULL,
    `professionalStatementAr` TEXT NULL,
    `avatarMediaId` INTEGER NULL,
    `resumeMediaId` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `Profile_state_key`(`state`),
    INDEX `Profile_avatarMediaId_idx`(`avatarMediaId`),
    INDEX `Profile_resumeMediaId_idx`(`resumeMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Hero` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `headline` VARCHAR(200) NULL,
    `headlineAr` VARCHAR(200) NULL,
    `subtitle` VARCHAR(200) NULL,
    `subtitleAr` VARCHAR(200) NULL,
    `description` TEXT NULL,
    `descriptionAr` TEXT NULL,
    `backgroundWord` VARCHAR(60) NULL,
    `backgroundWordAr` VARCHAR(60) NULL,
    `primaryButtonText` VARCHAR(80) NULL,
    `primaryButtonTextAr` VARCHAR(80) NULL,
    `primaryButtonUrl` VARCHAR(512) NULL,
    `secondaryButtonText` VARCHAR(80) NULL,
    `secondaryButtonTextAr` VARCHAR(80) NULL,
    `secondaryButtonUrl` VARCHAR(512) NULL,
    `audioEnabled` BOOLEAN NOT NULL DEFAULT true,
    `videoMp4MediaId` INTEGER NULL,
    `videoWebmMediaId` INTEGER NULL,
    `posterMediaId` INTEGER NULL,
    `fallbackImageMediaId` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `Hero_state_key`(`state`),
    INDEX `Hero_videoMp4MediaId_idx`(`videoMp4MediaId`),
    INDEX `Hero_videoWebmMediaId_idx`(`videoWebmMediaId`),
    INDEX `Hero_posterMediaId_idx`(`posterMediaId`),
    INDEX `Hero_fallbackImageMediaId_idx`(`fallbackImageMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `About` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `heading` VARCHAR(160) NULL,
    `headingAr` VARCHAR(160) NULL,
    `introduction` TEXT NULL,
    `introductionAr` TEXT NULL,
    `fullDescription` TEXT NULL,
    `fullDescriptionAr` TEXT NULL,
    `quote` VARCHAR(500) NULL,
    `quoteAr` VARCHAR(500) NULL,
    `idCardTitle` VARCHAR(60) NULL,
    `idCardTitleAr` VARCHAR(60) NULL,
    `idCardSubtitle` VARCHAR(120) NULL,
    `idCardSubtitleAr` VARCHAR(120) NULL,
    `idCardBackContent` VARCHAR(500) NULL,
    `idCardBackContentAr` VARCHAR(500) NULL,
    `idCardPortraitMediaId` INTEGER NULL,
    `showIdCard` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `About_state_key`(`state`),
    INDEX `About_idCardPortraitMediaId_idx`(`idCardPortraitMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `heading` VARCHAR(200) NULL,
    `headingAr` VARCHAR(200) NULL,
    `description` VARCHAR(500) NULL,
    `descriptionAr` VARCHAR(500) NULL,
    `publicEmail` VARCHAR(190) NULL,
    `publicPhone` VARCHAR(40) NULL,
    `whatsappUrl` VARCHAR(512) NULL,
    `showPhone` BOOLEAN NOT NULL DEFAULT false,
    `showWhatsapp` BOOLEAN NOT NULL DEFAULT false,
    `enableContactForm` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `ContactSettings_state_key`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `siteName` VARCHAR(160) NOT NULL,
    `siteNameAr` VARCHAR(160) NULL,
    `siteDescription` VARCHAR(500) NULL,
    `siteDescriptionAr` VARCHAR(500) NULL,
    `siteUrl` VARCHAR(512) NULL,
    `primaryLanguage` ENUM('EN', 'AR') NOT NULL DEFAULT 'EN',
    `footerText` VARCHAR(300) NULL,
    `footerTextAr` VARCHAR(300) NULL,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `faviconMediaId` INTEGER NULL,
    `logoMediaId` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `SiteSettings_state_key`(`state`),
    INDEX `SiteSettings_faviconMediaId_idx`(`faviconMediaId`),
    INDEX `SiteSettings_logoMediaId_idx`(`logoMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pageKey` VARCHAR(60) NOT NULL,
    `state` ENUM('DRAFT', 'PUBLISHED') NOT NULL,
    `title` VARCHAR(200) NULL,
    `titleAr` VARCHAR(200) NULL,
    `description` VARCHAR(500) NULL,
    `descriptionAr` VARCHAR(500) NULL,
    `canonicalUrl` VARCHAR(512) NULL,
    `ogTitle` VARCHAR(200) NULL,
    `ogTitleAr` VARCHAR(200) NULL,
    `ogDescription` VARCHAR(500) NULL,
    `ogDescriptionAr` VARCHAR(500) NULL,
    `ogImageMediaId` INTEGER NULL,
    `robotsIndex` BOOLEAN NOT NULL DEFAULT true,
    `robotsFollow` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    INDEX `SeoSettings_ogImageMediaId_idx`(`ogImageMediaId`),
    UNIQUE INDEX `SeoSettings_pageKey_state_key`(`pageKey`, `state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AboutFact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(80) NOT NULL,
    `labelAr` VARCHAR(80) NULL,
    `value` VARCHAR(255) NOT NULL,
    `valueAr` VARCHAR(255) NULL,
    `icon` VARCHAR(60) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',

    INDEX `AboutFact_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SkillCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `nameAr` VARCHAR(80) NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` VARCHAR(300) NULL,
    `descriptionAr` VARCHAR(300) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',

    UNIQUE INDEX `SkillCategory_slug_key`(`slug`),
    INDEX `SkillCategory_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `symbol` VARCHAR(3) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `logoMediaId` INTEGER NULL,
    `externalLogoReference` VARCHAR(60) NULL,
    `description` VARCHAR(300) NULL,
    `descriptionAr` VARCHAR(300) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Skill_slug_key`(`slug`),
    INDEX `Skill_categoryId_sortOrder_idx`(`categoryId`, `sortOrder`),
    INDEX `Skill_status_idx`(`status`),
    INDEX `Skill_logoMediaId_idx`(`logoMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `nameAr` VARCHAR(80) NULL,
    `slug` VARCHAR(100) NOT NULL,
    `visualKind` ENUM('WEBSITE', 'WEB_MOBILE', 'MOBILE', 'SYSTEM') NOT NULL DEFAULT 'WEBSITE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ProjectCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `titleAr` VARCHAR(160) NULL,
    `slug` VARCHAR(160) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `shortDescription` VARCHAR(600) NULL,
    `shortDescriptionAr` VARCHAR(600) NULL,
    `fullDescription` TEXT NULL,
    `fullDescriptionAr` TEXT NULL,
    `problemStatement` TEXT NULL,
    `problemStatementAr` TEXT NULL,
    `solution` TEXT NULL,
    `solutionAr` TEXT NULL,
    `role` VARCHAR(255) NULL,
    `roleAr` VARCHAR(255) NULL,
    `stage` ENUM('COMPLETED', 'IN_PROGRESS', 'MAINTENANCE', 'ARCHIVED') NOT NULL DEFAULT 'COMPLETED',
    `liveUrl` VARCHAR(512) NULL,
    `repositoryUrl` VARCHAR(512) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `seoTitle` VARCHAR(200) NULL,
    `seoTitleAr` VARCHAR(200) NULL,
    `seoDescription` VARCHAR(500) NULL,
    `seoDescriptionAr` VARCHAR(500) NULL,
    `canonicalUrl` VARCHAR(512) NULL,
    `ogImageMediaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `Project_slug_key`(`slug`),
    INDEX `Project_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `Project_categoryId_idx`(`categoryId`),
    INDEX `Project_featured_idx`(`featured`),
    INDEX `Project_ogImageMediaId_idx`(`ogImageMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectFeature` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `titleAr` VARCHAR(160) NULL,
    `description` VARCHAR(500) NULL,
    `descriptionAr` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProjectFeature_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectMedia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `mediaId` INTEGER NOT NULL,
    `caption` VARCHAR(300) NULL,
    `captionAr` VARCHAR(300) NULL,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `isIllustrative` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProjectMedia_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    INDEX `ProjectMedia_mediaId_idx`(`mediaId`),
    UNIQUE INDEX `ProjectMedia_projectId_mediaId_key`(`projectId`, `mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectSkill` (
    `projectId` INTEGER NOT NULL,
    `skillId` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProjectSkill_skillId_idx`(`skillId`),
    PRIMARY KEY (`projectId`, `skillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Experience` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization` VARCHAR(160) NOT NULL,
    `organizationAr` VARCHAR(160) NULL,
    `position` VARCHAR(160) NOT NULL,
    `positionAr` VARCHAR(160) NULL,
    `employmentType` VARCHAR(60) NULL,
    `location` VARCHAR(160) NULL,
    `locationAr` VARCHAR(160) NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `descriptionAr` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Experience_status_startDate_idx`(`status`, `startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Education` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institution` VARCHAR(160) NOT NULL,
    `institutionAr` VARCHAR(160) NULL,
    `qualification` VARCHAR(160) NOT NULL,
    `qualificationAr` VARCHAR(160) NULL,
    `fieldOfStudy` VARCHAR(160) NULL,
    `fieldOfStudyAr` VARCHAR(160) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `description` TEXT NULL,
    `descriptionAr` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Education_status_endDate_idx`(`status`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Certification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `titleAr` VARCHAR(200) NULL,
    `issuer` VARCHAR(160) NOT NULL,
    `issuerAr` VARCHAR(160) NULL,
    `issueDate` DATE NULL,
    `verificationUrl` VARCHAR(512) NULL,
    `description` VARCHAR(500) NULL,
    `descriptionAr` VARCHAR(500) NULL,
    `mediaId` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Certification_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `Certification_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Achievement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `titleAr` VARCHAR(200) NULL,
    `description` VARCHAR(500) NULL,
    `descriptionAr` VARCHAR(500) NULL,
    `numericValue` INTEGER NULL,
    `numericSuffix` VARCHAR(10) NULL,
    `platform` VARCHAR(120) NULL,
    `logoMediaId` INTEGER NULL,
    `logoKey` VARCHAR(60) NULL,
    `verificationUrl` VARCHAR(512) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Achievement_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `Achievement_logoMediaId_idx`(`logoMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocialLink` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform` ENUM('GITHUB', 'LINKEDIN', 'BEHANCE', 'DRIBBBLE', 'X', 'YOUTUBE', 'INSTAGRAM', 'WEBSITE', 'OTHER') NOT NULL,
    `label` VARCHAR(80) NOT NULL,
    `labelAr` VARCHAR(80) NULL,
    `handle` VARCHAR(120) NULL,
    `url` VARCHAR(512) NOT NULL,
    `icon` VARCHAR(60) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') NOT NULL DEFAULT 'DRAFT',

    INDEX `SocialLink_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `subject` VARCHAR(200) NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('NEW', 'READ', 'ARCHIVED') NOT NULL DEFAULT 'NEW',
    `ipHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `ContactMessage_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NavigationItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sectionKey` ENUM('HERO', 'ABOUT', 'SKILLS', 'WORK', 'CERTIFICATIONS', 'EXPERIENCE', 'ACHIEVEMENTS', 'CONTACT') NULL,
    `label` VARCHAR(80) NOT NULL,
    `labelAr` VARCHAR(80) NULL,
    `targetUrl` VARCHAR(512) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `NavigationItem_sectionKey_key`(`sectionKey`),
    INDEX `NavigationItem_isVisible_sortOrder_idx`(`isVisible`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SectionSetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sectionKey` ENUM('HERO', 'ABOUT', 'SKILLS', 'WORK', 'CERTIFICATIONS', 'EXPERIENCE', 'ACHIEVEMENTS', 'CONTACT') NOT NULL,
    `displayName` VARCHAR(80) NOT NULL,
    `displayNameAr` VARCHAR(80) NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `configuration` JSON NULL,

    UNIQUE INDEX `SectionSetting_sectionKey_key`(`sectionKey`),
    INDEX `SectionSetting_isEnabled_sortOrder_idx`(`isEnabled`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorEmail` VARCHAR(190) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(80) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminSession` ADD CONSTRAINT `AdminSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_avatarMediaId_fkey` FOREIGN KEY (`avatarMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_resumeMediaId_fkey` FOREIGN KEY (`resumeMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hero` ADD CONSTRAINT `Hero_videoMp4MediaId_fkey` FOREIGN KEY (`videoMp4MediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hero` ADD CONSTRAINT `Hero_videoWebmMediaId_fkey` FOREIGN KEY (`videoWebmMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hero` ADD CONSTRAINT `Hero_posterMediaId_fkey` FOREIGN KEY (`posterMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hero` ADD CONSTRAINT `Hero_fallbackImageMediaId_fkey` FOREIGN KEY (`fallbackImageMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `About` ADD CONSTRAINT `About_idCardPortraitMediaId_fkey` FOREIGN KEY (`idCardPortraitMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSettings` ADD CONSTRAINT `SiteSettings_faviconMediaId_fkey` FOREIGN KEY (`faviconMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSettings` ADD CONSTRAINT `SiteSettings_logoMediaId_fkey` FOREIGN KEY (`logoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeoSettings` ADD CONSTRAINT `SeoSettings_ogImageMediaId_fkey` FOREIGN KEY (`ogImageMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SkillCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_logoMediaId_fkey` FOREIGN KEY (`logoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ProjectCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_ogImageMediaId_fkey` FOREIGN KEY (`ogImageMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectFeature` ADD CONSTRAINT `ProjectFeature_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMedia` ADD CONSTRAINT `ProjectMedia_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMedia` ADD CONSTRAINT `ProjectMedia_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSkill` ADD CONSTRAINT `ProjectSkill_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSkill` ADD CONSTRAINT `ProjectSkill_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `Skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certification` ADD CONSTRAINT `Certification_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Achievement` ADD CONSTRAINT `Achievement_logoMediaId_fkey` FOREIGN KEY (`logoMediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

