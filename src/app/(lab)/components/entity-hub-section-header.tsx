import styles from "./entity-hub.module.css";

export function EntityHubSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <p className={styles.sectionTitle}>{title}</p>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      <div className={styles.sectionLine} />
    </div>
  );
}
