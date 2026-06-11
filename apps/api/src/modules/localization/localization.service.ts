import { randomUUID } from "node:crypto";
import {
  demoLocalizationPreference,
  demoRegionalComplianceProfile,
  demoUser,
  demoWorkspace,
  localeDirections,
  supportedLocales,
  type LocalizationPreference,
  type RegionalComplianceProfile
} from "@ssm/domain";
import { Injectable } from "@nestjs/common";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type {
  UpdateLocalizationPreferenceDto,
  UpdateRegionalComplianceProfileDto
} from "./dto.js";

@Injectable()
export class LocalizationService {
  private readonly preferences: LocalizationPreference[] = [{ ...demoLocalizationPreference }];
  private readonly complianceProfiles: RegionalComplianceProfile[] = [
    {
      ...demoRegionalComplianceProfile,
      regulations: [...demoRegionalComplianceProfile.regulations]
    }
  ];

  constructor(private readonly auditService: AuditService) {}

  capabilities() {
    return {
      supportedLocales,
      localeDirections,
      dateFormats: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
      timeFormats: ["12h", "24h"],
      dataResidencyRegions: ["global", "us", "eu", "in", "jp"],
      complianceRegulations: ["gdpr", "ccpa", "dpdp", "lgpd", "soc2"]
    };
  }

  getPreference(workspaceId = demoWorkspace.id, userId = demoUser.id) {
    return this.findOrCreatePreference(workspaceId, userId);
  }

  updatePreference(input: UpdateLocalizationPreferenceDto, actor?: Principal) {
    const preference = this.findOrCreatePreference(input.workspaceId, input.userId ?? actor?.userId ?? demoUser.id);
    const previous = { ...preference };
    const locale = input.locale ?? preference.locale;
    preference.locale = locale;
    preference.direction = input.direction ?? (locale === "ar" ? "rtl" : preference.direction);
    preference.timezone = input.timezone ?? preference.timezone;
    preference.dateFormat = input.dateFormat ?? preference.dateFormat;
    preference.timeFormat = input.timeFormat ?? preference.timeFormat;
    preference.firstDayOfWeek = input.firstDayOfWeek ?? preference.firstDayOfWeek;
    preference.numberingSystem = input.numberingSystem ?? preference.numberingSystem;
    preference.contentTranslationEnabled =
      input.contentTranslationEnabled ?? preference.contentTranslationEnabled;
    preference.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: preference.workspaceId,
      userId: actor?.userId,
      action: "localization.preference_updated",
      entityType: "localization_preference",
      entityId: preference.id,
      oldValues: {
        locale: previous.locale,
        timezone: previous.timezone,
        dateFormat: previous.dateFormat,
        timeFormat: previous.timeFormat
      },
      newValues: {
        locale: preference.locale,
        direction: preference.direction,
        timezone: preference.timezone,
        dateFormat: preference.dateFormat,
        timeFormat: preference.timeFormat
      }
    });
    return preference;
  }

  getComplianceProfile(workspaceId = demoWorkspace.id) {
    return this.findOrCreateComplianceProfile(workspaceId);
  }

  updateComplianceProfile(input: UpdateRegionalComplianceProfileDto, actor?: Principal) {
    const profile = this.findOrCreateComplianceProfile(input.workspaceId, actor);
    const previous = { ...profile, regulations: [...profile.regulations] };
    profile.dataResidency = input.dataResidency ?? profile.dataResidency;
    profile.primaryRegion = input.primaryRegion ?? profile.primaryRegion;
    profile.regulations = input.regulations ? [...new Set(input.regulations)] : profile.regulations;
    profile.consentRequired = input.consentRequired ?? profile.consentRequired;
    profile.retentionDays = input.retentionDays ?? profile.retentionDays;
    profile.crossBorderTransfer = input.crossBorderTransfer ?? profile.crossBorderTransfer;
    profile.updatedBy = actor?.userId ?? demoUser.id;
    profile.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: profile.workspaceId,
      userId: actor?.userId,
      action: "localization.compliance_profile_updated",
      entityType: "regional_compliance_profile",
      entityId: profile.id,
      oldValues: {
        dataResidency: previous.dataResidency,
        regulations: previous.regulations,
        retentionDays: previous.retentionDays
      },
      newValues: {
        dataResidency: profile.dataResidency,
        primaryRegion: profile.primaryRegion,
        regulations: profile.regulations,
        retentionDays: profile.retentionDays,
        crossBorderTransfer: profile.crossBorderTransfer
      }
    });
    return profile;
  }

  private findOrCreatePreference(workspaceId: string, userId: string): LocalizationPreference {
    const existing = this.preferences.find(
      (preference) => preference.workspaceId === workspaceId && preference.userId === userId
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const preference: LocalizationPreference = {
      id: randomUUID(),
      workspaceId,
      userId,
      locale: "en",
      direction: "ltr",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      firstDayOfWeek: 0,
      numberingSystem: "latn",
      contentTranslationEnabled: false,
      createdAt: now,
      updatedAt: now
    };
    this.preferences.unshift(preference);
    return preference;
  }

  private findOrCreateComplianceProfile(
    workspaceId: string,
    actor?: Principal
  ): RegionalComplianceProfile {
    const existing = this.complianceProfiles.find((profile) => profile.workspaceId === workspaceId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const profile: RegionalComplianceProfile = {
      id: randomUUID(),
      workspaceId,
      dataResidency: "global",
      primaryRegion: "global",
      regulations: ["soc2"],
      consentRequired: false,
      retentionDays: 365,
      crossBorderTransfer: true,
      updatedBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };
    this.complianceProfiles.unshift(profile);
    return profile;
  }
}
