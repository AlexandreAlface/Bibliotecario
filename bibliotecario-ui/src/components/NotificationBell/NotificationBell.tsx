import React, { useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  IconButtonProps,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export interface NotificationItem {
  id: string;
  titulo: string;
  mensagem?: string;
  lida?: boolean;
  data?: Date;
}

export interface NotificationBellProps extends Omit<IconButtonProps, 'onSelect'> {
  /** Lista actual de notificações (ordenada como quiseres) */
  items: NotificationItem[];
  /** Clicar numa notificação */
  onSelect?: (item: NotificationItem) => void;
  /** Remover (apenas) uma notificação */
  onRemove?: (id: string) => void;
  /** Marcar todas como lidas / limpar contador  */
  onClearAll?: () => void;
  /** Mostrar badge mesmo quando 0 (ex.: cor cinza) */
  showZero?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  items,
  onSelect,
  onRemove,
  onClearAll,
  showZero = false,
  ...iconButtonProps
}) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const unread = items.filter((i) => !i.lida).length;

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          {...iconButtonProps}
          onClick={(e) => setAnchor(e.currentTarget)}
          size="large"
        >
          <Badge
            color="error"
            badgeContent={unread}
            invisible={!showZero && unread === 0}
          >
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { width: 300, maxHeight: 360, p: 0 } }}
      >
        <Box px={2} py={1.5}>
          <Typography fontWeight={600}>Notificações</Typography>
        </Box>

        <Divider />

        {items.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Sem notificações.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((n) => (
              <ListItem
                key={n.id}
                alignItems="flex-start"
                secondaryAction={
                  onRemove && (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onRemove(n.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )
                }
                sx={{
                  bgcolor: n.lida ? 'background.paper' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
                onClick={() => {
                  onSelect?.(n);
                  setAnchor(null);
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight={n.lida ? 400 : 600}
                    >
                      {n.titulo}
                    </Typography>
                  }
                  secondary={
                    n.mensagem && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {n.mensagem}
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {!!items.length && (
          <>
            <Divider />
            <MenuItem onClick={() => onClearAll?.()}>
              <Typography variant="body2" textAlign="center" width="100%">
                Limpar todas
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};
