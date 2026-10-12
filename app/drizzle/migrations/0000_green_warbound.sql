CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`asset_id` int,
	`action` enum('created','updated','evaluated','synced_to_shopify','sync_failed','deleted') NOT NULL,
	`summary` varchar(255) NOT NULL,
	`details` text,
	`metadata_json` text,
	`performed_by` varchar(100) NOT NULL DEFAULT 'Admin Merchant',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`preset_id` int,
	`shopify_product_id` varchar(100),
	`title` varchar(255) NOT NULL,
	`category` enum('environment','props','weapons','characters','vehicles','nature','buildings','modular_kits','vfx') NOT NULL,
	`model_url` text NOT NULL,
	`poster_url` text,
	`asset_format` varchar(100) NOT NULL DEFAULT 'GLB / FBX',
	`engine_support` varchar(255) NOT NULL DEFAULT 'Unreal Engine 5 / Unity / Godot',
	`polycount` int NOT NULL,
	`lod_count` int NOT NULL DEFAULT 3,
	`texture_resolution` varchar(50) NOT NULL DEFAULT '4K PBR',
	`is_rigged` boolean NOT NULL DEFAULT false,
	`animation_clips` int NOT NULL DEFAULT 0,
	`license_type` varchar(100) NOT NULL DEFAULT 'Commercial Royalty-Free',
	`price` varchar(50) NOT NULL DEFAULT '39.00',
	`sync_status` enum('draft','synced','sync_failed','out_of_sync') NOT NULL DEFAULT 'draft',
	`last_synced_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asset_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`overall_score` int NOT NULL,
	`polycount_score` int NOT NULL,
	`texture_score` int NOT NULL,
	`engine_score` int NOT NULL,
	`rig_score` int NOT NULL,
	`quality_tier` enum('tier_s','tier_a','tier_b','tier_c') NOT NULL,
	`alerts_json` text NOT NULL,
	`recommendations_json` text NOT NULL,
	`evaluated_at` timestamp DEFAULT (now()),
	CONSTRAINT `asset_evaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `asset_evaluations_asset_id_unique` UNIQUE(`asset_id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`target_engine` enum('unreal_5','unity_urp','godot_4','webgl') NOT NULL,
	`max_recommended_tris` int NOT NULL,
	`required_texture_format` varchar(100) NOT NULL,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pipeline_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_domain` varchar(255) NOT NULL,
	`access_token` text NOT NULL,
	`scope` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`installed_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_shop_domain_unique` UNIQUE(`shop_domain`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_asset_id_asset_catalog_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `asset_catalog`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_catalog` ADD CONSTRAINT `asset_catalog_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_catalog` ADD CONSTRAINT `asset_catalog_preset_id_pipeline_presets_id_fk` FOREIGN KEY (`preset_id`) REFERENCES `pipeline_presets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asset_evaluations` ADD CONSTRAINT `asset_evaluations_asset_id_asset_catalog_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `asset_catalog`(`id`) ON DELETE cascade ON UPDATE no action;