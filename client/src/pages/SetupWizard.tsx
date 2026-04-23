import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useConfigs, useUpdateConfig } from "@/hooks/use-configs";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  CircleDot,
  CircleCheck,
  HelpCircle,
  Sparkles,
  Database,
  PartyPopper,
  SkipForward,
} from "lucide-react";
import { SiGoogle, SiFacebook, SiInstagram, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  helpText: string;
  sensitive?: boolean;
}

interface StepDef {
  id: string;
  connectorName: string;
  title: string;
  subtitle: string;
  icon: any;
  iconColor: string;
  fields: FieldDef[];
  instructions: { step: number; text: string; link?: string; linkText?: string }[];
  optional?: boolean;
}

const WIZARD_STEPS: StepDef[] = [
  {
    id: "google_ads",
    connectorName: "google_ads",
    title: "Google Ads",
    subtitle: "Connect your Google Ads account to pull campaign data",
    icon: SiGoogle,
    iconColor: "text-blue-400",
    fields: [
      { key: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer Token", placeholder: "e.g. ABcdEfGhIjKlMnOp", helpText: "Found in your Google Ads Manager account under API Center", sensitive: true },
      { key: "GOOGLE_ADS_CLIENT_ID", label: "Client ID", placeholder: "e.g. 123456789.apps.googleusercontent.com", helpText: "From Google Cloud Console > Credentials" },
      { key: "GOOGLE_ADS_CLIENT_SECRET", label: "Client Secret", placeholder: "e.g. GOCSPX-xxxxx", helpText: "From Google Cloud Console > Credentials", sensitive: true },
      { key: "GOOGLE_ADS_REFRESH_TOKEN", label: "Refresh Token", placeholder: "e.g. 1//0abc...", helpText: "Generated when you authorize the app", sensitive: true },
      { key: "GOOGLE_ADS_CUSTOMER_ID", label: "Customer ID", placeholder: "e.g. 1234567890 (no dashes)", helpText: "Your 10-digit account number, found at the top of Google Ads" },
      { key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", label: "Manager Account ID (optional)", placeholder: "e.g. 1234567890", helpText: "Only needed if you use a manager (MCC) account" },
    ],
    instructions: [
      { step: 1, text: "Log in to Google Ads and go to Tools > API Center", link: "https://ads.google.com/", linkText: "Open Google Ads" },
      { step: 2, text: "Copy your Developer Token from the API Center page" },
      { step: 3, text: "Go to Google Cloud Console and create OAuth 2.0 credentials", link: "https://console.cloud.google.com/apis/credentials", linkText: "Open Cloud Console" },
      { step: 4, text: "Copy the Client ID and Client Secret" },
      { step: 5, text: "Use the OAuth Playground to generate a Refresh Token", link: "https://developers.google.com/oauthplayground/", linkText: "Open OAuth Playground" },
      { step: 6, text: "Find your Customer ID at the top right of Google Ads (remove dashes)" },
    ],
  },
  {
    id: "ga4",
    connectorName: "ga4",
    title: "Google Analytics",
    subtitle: "Pull website traffic and conversion data from GA4",
    icon: SiGoogle,
    iconColor: "text-orange-400",
    fields: [
      { key: "GA4_PROPERTY_ID", label: "Property ID", placeholder: "e.g. 123456789", helpText: "Found in GA4 > Admin > Property Settings" },
      { key: "GOOGLE_APPLICATION_CREDENTIALS", label: "Service Account Key (JSON path)", placeholder: "e.g. ./service-account.json", helpText: "Path to the downloaded service account JSON file" },
    ],
    instructions: [
      { step: 1, text: "Open Google Analytics and go to Admin > Property Settings", link: "https://analytics.google.com/", linkText: "Open Google Analytics" },
      { step: 2, text: "Copy your Property ID (it's a number like 123456789)" },
      { step: 3, text: "Go to Google Cloud Console > IAM > Service Accounts", link: "https://console.cloud.google.com/iam-admin/serviceaccounts", linkText: "Open Cloud Console" },
      { step: 4, text: "Create a service account and download the JSON key file" },
      { step: 5, text: "In GA4, go to Admin > Property Access Management and add the service account email as a Viewer" },
    ],
  },
  {
    id: "facebook",
    connectorName: "facebook",
    title: "Facebook Ads",
    subtitle: "Connect your Facebook Ads account for campaign performance data",
    icon: SiFacebook,
    iconColor: "text-blue-500",
    fields: [
      { key: "FACEBOOK_APP_ID", label: "App ID", placeholder: "e.g. 1234567890", helpText: "Found on your Facebook App dashboard" },
      { key: "FACEBOOK_APP_SECRET", label: "App Secret", placeholder: "e.g. abcdef1234567890", helpText: "Found under App Settings > Basic", sensitive: true },
      { key: "FACEBOOK_ACCESS_TOKEN", label: "Access Token", placeholder: "e.g. EAABsbCS1...", helpText: "A long-lived token from Graph API Explorer", sensitive: true },
      { key: "FACEBOOK_AD_ACCOUNT_ID", label: "Ad Account ID", placeholder: "e.g. act_1234567890", helpText: "Starts with 'act_' followed by numbers" },
    ],
    instructions: [
      { step: 1, text: "Go to Meta for Developers and create an app (choose 'Business' type)", link: "https://developers.facebook.com/apps/", linkText: "Open Meta Developers" },
      { step: 2, text: "Copy your App ID and App Secret from Settings > Basic" },
      { step: 3, text: "Use the Graph API Explorer to get a long-lived Access Token", link: "https://developers.facebook.com/tools/explorer/", linkText: "Open Graph Explorer" },
      { step: 4, text: "Find your Ad Account ID in Facebook Ads Manager (it starts with act_)", link: "https://adsmanager.facebook.com/", linkText: "Open Ads Manager" },
    ],
  },
  {
    id: "instagram",
    connectorName: "instagram",
    title: "Instagram",
    subtitle: "Pull engagement and follower data from your business profile",
    icon: SiInstagram,
    iconColor: "text-pink-400",
    optional: true,
    fields: [
      { key: "INSTAGRAM_ACCESS_TOKEN", label: "Access Token", placeholder: "e.g. EAABsbCS1...", helpText: "Same type of token as Facebook (uses Facebook Graph API)", sensitive: true },
      { key: "INSTAGRAM_BUSINESS_ACCOUNT_ID", label: "Business Account ID", placeholder: "e.g. 17841400000000", helpText: "Your Instagram Business Account ID (linked to Facebook Page)" },
    ],
    instructions: [
      { step: 1, text: "Make sure your Instagram account is a Business or Creator account" },
      { step: 2, text: "Link your Instagram to a Facebook Page (Settings > Linked Accounts)" },
      { step: 3, text: "Use the Graph API Explorer to find your Business Account ID", link: "https://developers.facebook.com/tools/explorer/", linkText: "Open Graph Explorer" },
      { step: 4, text: "Query: me/accounts, then use the Page ID to query: {page_id}?fields=instagram_business_account" },
    ],
  },
  {
    id: "youtube",
    connectorName: "youtube",
    title: "YouTube",
    subtitle: "Track your video performance, views, and subscriber growth",
    icon: SiYoutube,
    iconColor: "text-red-500",
    optional: true,
    fields: [
      { key: "YOUTUBE_CLIENT_ID", label: "Client ID", placeholder: "e.g. 123456789.apps.googleusercontent.com", helpText: "From Google Cloud Console > Credentials" },
      { key: "YOUTUBE_CLIENT_SECRET", label: "Client Secret", placeholder: "e.g. GOCSPX-xxxxx", helpText: "From Google Cloud Console > Credentials", sensitive: true },
      { key: "YOUTUBE_REFRESH_TOKEN", label: "Refresh Token", placeholder: "e.g. 1//0abc...", helpText: "Generated when you authorize the YouTube Data API", sensitive: true },
      { key: "YOUTUBE_CHANNEL_ID", label: "Channel ID", placeholder: "e.g. UCxxxxxxxxxxxxxx", helpText: "Found on your YouTube channel page URL or in YouTube Studio" },
    ],
    instructions: [
      { step: 1, text: "Go to Google Cloud Console and enable the YouTube Data API v3", link: "https://console.cloud.google.com/apis/library/youtube.googleapis.com", linkText: "Enable YouTube API" },
      { step: 2, text: "Create OAuth 2.0 credentials (or reuse the ones from Google Ads)" },
      { step: 3, text: "Use the OAuth Playground to generate a Refresh Token with YouTube scope", link: "https://developers.google.com/oauthplayground/", linkText: "Open OAuth Playground" },
      { step: 4, text: "Find your Channel ID in YouTube Studio > Settings > Channel > Advanced", link: "https://studio.youtube.com/", linkText: "Open YouTube Studio" },
    ],
  },
  {
    id: "google_guaranteed",
    connectorName: "google_guaranteed",
    title: "Google Guaranteed",
    subtitle: "Local Services Ads data for home service businesses",
    icon: SiGoogle,
    iconColor: "text-green-400",
    optional: true,
    fields: [
      { key: "GOOGLE_GUARANTEED_CLIENT_ID", label: "Client ID", placeholder: "e.g. 123456789.apps.googleusercontent.com", helpText: "From Google Cloud Console > Credentials" },
      { key: "GOOGLE_GUARANTEED_CLIENT_SECRET", label: "Client Secret", placeholder: "e.g. GOCSPX-xxxxx", helpText: "From Google Cloud Console > Credentials", sensitive: true },
      { key: "GOOGLE_GUARANTEED_REFRESH_TOKEN", label: "Refresh Token", placeholder: "e.g. 1//0abc...", helpText: "Generated when you authorize the Local Services API", sensitive: true },
    ],
    instructions: [
      { step: 1, text: "Go to Google Cloud Console and enable the Local Services API", link: "https://console.cloud.google.com/", linkText: "Open Cloud Console" },
      { step: 2, text: "Create OAuth 2.0 credentials (or reuse existing ones)" },
      { step: 3, text: "Generate a Refresh Token using the OAuth Playground" },
    ],
  },
  {
    id: "google_business",
    connectorName: "google_business",
    title: "Google Business Profile",
    subtitle: "Pull reviews, search queries, and visibility data",
    icon: SiGoogle,
    iconColor: "text-cyan-400",
    optional: true,
    fields: [
      { key: "GOOGLE_BUSINESS_ACCOUNT_ID", label: "Account ID", placeholder: "e.g. accounts/123456789", helpText: "Found in Google Business Profile Manager" },
      { key: "GOOGLE_BUSINESS_LOCATION_ID", label: "Location ID", placeholder: "e.g. locations/123456789", helpText: "The specific business location to pull data for" },
      { key: "GOOGLE_BUSINESS_CLIENT_ID", label: "Client ID", placeholder: "e.g. 123456789.apps.googleusercontent.com", helpText: "From Google Cloud Console > Credentials" },
      { key: "GOOGLE_BUSINESS_CLIENT_SECRET", label: "Client Secret", placeholder: "e.g. GOCSPX-xxxxx", helpText: "From Google Cloud Console > Credentials", sensitive: true },
      { key: "GOOGLE_BUSINESS_REFRESH_TOKEN", label: "Refresh Token", placeholder: "e.g. 1//0abc...", helpText: "Generated when you authorize the Business Profile API", sensitive: true },
    ],
    instructions: [
      { step: 1, text: "Go to Google Cloud Console and enable the Business Profile API", link: "https://console.cloud.google.com/", linkText: "Open Cloud Console" },
      { step: 2, text: "Create OAuth 2.0 credentials" },
      { step: 3, text: "Find your Account ID and Location ID in Google Business Profile Manager", link: "https://business.google.com/", linkText: "Open Business Profile" },
    ],
  },
  {
    id: "bigquery",
    connectorName: "bigquery",
    title: "BigQuery Destination",
    subtitle: "Where your data gets stored for reporting",
    icon: Database,
    iconColor: "text-primary",
    fields: [
      { key: "BIGQUERY_PROJECT_ID", label: "Project ID", placeholder: "e.g. my-company-analytics", helpText: "Your Google Cloud project name" },
      { key: "BIGQUERY_DATASET_ID", label: "Dataset Name", placeholder: "e.g. marketing_data", helpText: "The dataset where tables will be created (we'll create it if it doesn't exist)" },
      { key: "BIGQUERY_LOCATION", label: "Data Location", placeholder: "e.g. US", helpText: "Where to store data: US, EU, etc." },
    ],
    instructions: [
      { step: 1, text: "Go to Google Cloud Console and open BigQuery", link: "https://console.cloud.google.com/bigquery", linkText: "Open BigQuery" },
      { step: 2, text: "Copy your Project ID from the top of the page (next to the Google Cloud logo)" },
      { step: 3, text: "Choose a name for your dataset (e.g. 'marketing_data') - we'll create it automatically" },
      { step: 4, text: "Pick your data location: 'US' for North America, 'EU' for Europe" },
    ],
  },
];

function WizardField({ field, value, onChange }: { field: FieldDef; value: string; onChange: (val: string) => void }) {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="space-y-2" data-testid={`field-${field.key}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{field.label}</label>
        {field.sensitive && (
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            data-testid={`toggle-visibility-${field.key}`}
          >
            {showValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showValue ? "Hide" : "Show"}
          </button>
        )}
      </div>
      <input
        type={field.sensitive && !showValue ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
        data-testid={`input-${field.key}`}
      />
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <HelpCircle className="w-3 h-3 mt-0.5 shrink-0" />
        {field.helpText}
      </p>
    </div>
  );
}

export default function SetupWizard() {
  const { data: configs, isLoading } = useConfigs();
  const { mutate: updateConfig, isPending } = useUpdateConfig();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showInstructions, setShowInstructions] = useState(true);

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  useEffect(() => {
    if (!configs) return;
    const newValues: Record<string, Record<string, string>> = {};
    const done = new Set<string>();

    for (const step of WIZARD_STEPS) {
      const existing = configs.find((c) => c.connectorName === step.connectorName);
      if (existing && existing.config) {
        const conf = existing.config as Record<string, string>;
        newValues[step.id] = {};
        let hasAnyValue = false;
        for (const field of step.fields) {
          newValues[step.id][field.key] = conf[field.key] || "";
          if (conf[field.key]) hasAnyValue = true;
        }
        if (hasAnyValue) done.add(step.id);
      } else {
        newValues[step.id] = {};
        for (const field of step.fields) {
          newValues[step.id][field.key] = "";
        }
      }
    }
    setFieldValues(newValues);
    setCompletedSteps(done);
  }, [configs]);

  const updateFieldValue = (fieldKey: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [currentStep.id]: {
        ...(prev[currentStep.id] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const saveCurrentStep = (onDone?: () => void) => {
    const values = fieldValues[currentStep.id] || {};
    const hasAnyValue = Object.values(values).some((v) => v.trim() !== "");

    if (!hasAnyValue) {
      if (onDone) onDone();
      return;
    }

    updateConfig(
      { connectorName: currentStep.connectorName, config: values, isActive: true },
      {
        onSuccess: () => {
          setCompletedSteps((prev) => new Set(prev).add(currentStep.id));
          toast({ title: "Saved!", description: `${currentStep.title} settings saved successfully.` });
          if (onDone) onDone();
        },
        onError: (err) => {
          toast({ title: "Save Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleNext = () => {
    saveCurrentStep(() => {
      if (isLastStep) {
        setLocation("/");
      } else {
        setCurrentStepIndex((i) => i + 1);
        setShowInstructions(true);
      }
    });
  };

  const handleSkip = () => {
    if (isLastStep) {
      setLocation("/");
    } else {
      setCurrentStepIndex((i) => i + 1);
      setShowInstructions(true);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((i) => i - 1);
      setShowInstructions(true);
    }
  };

  const currentValues = fieldValues[currentStep?.id] || {};
  const hasAnyFilledField = Object.values(currentValues).some((v) => v.trim() !== "");
  const progress = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center mb-8 space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-white/5 animate-pulse mx-auto" />
            <div className="h-7 w-48 bg-white/5 rounded-lg animate-pulse mx-auto" />
            <div className="h-4 w-72 bg-white/5 rounded animate-pulse mx-auto" />
          </div>
          <div className="flex justify-center gap-2 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ))}
          </div>
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="h-2 w-full bg-white/5 rounded-full animate-pulse" />
            <div className="space-y-5 mt-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3.5 w-32 bg-white/5 rounded animate-pulse" />
                  <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground" data-testid="text-wizard-title">Setup Wizard</h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-lg mx-auto">
            Let's connect your marketing accounts. We'll walk you through each one step by step.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStepIndex + 1} of {WIZARD_STEPS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="flex gap-1.5 mt-4 overflow-x-auto pb-2">
            {WIZARD_STEPS.map((step, idx) => {
              const isDone = completedSteps.has(step.id);
              const isCurrent = idx === currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => { setCurrentStepIndex(idx); setShowInstructions(true); }}
                  data-testid={`step-indicator-${step.id}`}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                    ${isCurrent ? "bg-primary text-primary-foreground shadow-md" : isDone ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}
                  `}
                >
                  {isDone ? <CircleCheck className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />}
                  {step.title}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 sm:px-8 py-6 border-b border-border/50 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${currentStep.iconColor}`}>
                    <currentStep.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-step-title">{currentStep.title}</h2>
                      {currentStep.optional && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Optional</span>
                      )}
                      {completedSteps.has(currentStep.id) && (
                        <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">{currentStep.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    data-testid="button-toggle-instructions"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-90" : ""}`} />
                    {showInstructions ? "Hide" : "Show"} step-by-step instructions
                  </button>

                  <AnimatePresence>
                    {showInstructions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 bg-primary/5 border border-primary/10 rounded-xl p-5 space-y-3">
                          <p className="text-sm font-semibold text-foreground">How to get these credentials:</p>
                          {currentStep.instructions.map((inst) => (
                            <div key={inst.step} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                                {inst.step}
                              </div>
                              <div className="text-sm text-muted-foreground flex-1">
                                {inst.text}
                                {inst.link && (
                                  <a
                                    href={inst.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 ml-1 font-medium transition-colors"
                                  >
                                    {inst.linkText} <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-5">
                  {currentStep.fields.map((field) => (
                    <WizardField
                      key={field.key}
                      field={field}
                      value={currentValues[field.key] || ""}
                      onChange={(val) => updateFieldValue(field.key, val)}
                    />
                  ))}
                </div>
              </div>

              <div className="px-6 sm:px-8 py-5 border-t border-border/50 bg-white/[0.02] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  {!isFirstStep && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5 rounded-xl hover:bg-white/5"
                      data-testid="button-wizard-back"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {currentStep.optional && (
                    <button
                      onClick={handleSkip}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5 rounded-xl hover:bg-white/5"
                      data-testid="button-wizard-skip"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 transition-all text-sm"
                    data-testid="button-wizard-next"
                  >
                    {isPending ? (
                      "Saving..."
                    ) : isLastStep ? (
                      <>
                        Finish Setup
                        <PartyPopper className="w-4 h-4" />
                      </>
                    ) : hasAnyFilledField ? (
                      <>
                        Save & Continue
                        <ChevronRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
